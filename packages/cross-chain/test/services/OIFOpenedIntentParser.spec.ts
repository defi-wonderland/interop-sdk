import { Address, encodeAbiParameters, Hex, Log, PublicClient } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    InvalidOpenEventError,
    OIFOpenedIntentParser,
    OIFOpenEventNotFoundError,
    OPEN_EVENT_SIGNATURE,
    PublicClientManager,
} from "../../src/internal.js";

/**
 * Create mock Open event log with full EIP-7683 ResolvedCrossChainOrder data
 */
const createMockOpenEventLog = (overrides?: Partial<Log>): Log => {
    const orderId = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as Hex;
    const user = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as Address;
    const originChainId = 11155111n;
    const openDeadline = 1700000000;
    const fillDeadline = 1700003600;
    const destinationChainId = 84532n; // Base Sepolia
    const inputAmount = 1000000000000000000n; // 1 ETH
    const outputAmount = 990000000000000000n; // 0.99 ETH

    // Encode the full ResolvedCrossChainOrder struct
    const data = encodeAbiParameters(
        [
            {
                type: "tuple",
                components: [
                    { type: "address", name: "user" },
                    { type: "uint256", name: "originChainId" },
                    { type: "uint32", name: "openDeadline" },
                    { type: "uint32", name: "fillDeadline" },
                    { type: "bytes32", name: "orderId" },
                    {
                        type: "tuple[]",
                        name: "maxSpent",
                        components: [
                            { type: "bytes32", name: "token" },
                            { type: "uint256", name: "amount" },
                            { type: "bytes32", name: "recipient" },
                            { type: "uint256", name: "chainId" },
                        ],
                    },
                    {
                        type: "tuple[]",
                        name: "minReceived",
                        components: [
                            { type: "bytes32", name: "token" },
                            { type: "uint256", name: "amount" },
                            { type: "bytes32", name: "recipient" },
                            { type: "uint256", name: "chainId" },
                        ],
                    },
                    {
                        type: "tuple[]",
                        name: "fillInstructions",
                        components: [
                            { type: "uint256", name: "destinationChainId" },
                            { type: "bytes32", name: "destinationSettler" },
                            { type: "bytes", name: "originData" },
                        ],
                    },
                ],
            },
        ],
        [
            {
                user,
                originChainId,
                openDeadline,
                fillDeadline,
                orderId,
                maxSpent: [
                    {
                        token: "0x0000000000000000000000000000000000000000000000000000000000000001" as Hex,
                        amount: inputAmount,
                        recipient:
                            "0x0000000000000000000000000000000000000000000000000000000000000002" as Hex,
                        chainId: originChainId,
                    },
                ],
                minReceived: [
                    {
                        token: "0x0000000000000000000000000000000000000000000000000000000000000003" as Hex,
                        amount: outputAmount,
                        recipient:
                            "0x0000000000000000000000000000000000000000000000000000000000000004" as Hex,
                        chainId: destinationChainId,
                    },
                ],
                fillInstructions: [
                    {
                        destinationChainId,
                        destinationSettler:
                            "0x0000000000000000000000000000000000000000000000000000000000000005" as Hex,
                        originData: "0x" as Hex,
                    },
                ],
            },
        ],
    );

    return {
        address: "0x5f9D51679F5A0C7C1e2b7F0aE8F2c3c7c9c1c2c3" as Address,
        blockHash: "0xaabbccdd1234567890aabbccdd1234567890aabbccdd1234567890aabbccdd12" as Hex,
        blockNumber: 1000000n,
        data,
        logIndex: 0,
        removed: false,
        topics: [OPEN_EVENT_SIGNATURE as Hex, orderId], // topic[0] = event sig, topic[1] = orderId (indexed)
        transactionHash:
            "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890" as Hex,
        transactionIndex: 0,
        ...overrides,
    } as Log;
};

describe("OIFOpenedIntentParser", () => {
    let parser: OIFOpenedIntentParser;
    let mockClientManager: PublicClientManager;
    let mockPublicClient: PublicClient;

    const mockTxHash = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890" as Hex;
    const mockChainId = 11155111; // Sepolia

    beforeEach(() => {
        vi.clearAllMocks();

        mockPublicClient = {
            getTransactionReceipt: vi.fn(),
        } as unknown as PublicClient;

        mockClientManager = {
            getClient: vi.fn().mockReturnValue(mockPublicClient),
        } as unknown as PublicClientManager;

        parser = new OIFOpenedIntentParser({
            clientManager: mockClientManager,
        });
    });

    describe("getOpenedIntent", () => {
        it("should parse OIF Open event and return complete OpenedIntent", async () => {
            const mockOpenLog = createMockOpenEventLog();

            vi.mocked(mockPublicClient.getTransactionReceipt).mockResolvedValue({
                logs: [mockOpenLog],
                blockNumber: 1000000n,
            } as unknown as ReturnType<PublicClient["getTransactionReceipt"]>);

            const result = await parser.getOpenedIntent(mockTxHash, mockChainId);

            // Basic fields
            expect(result.orderId).toBe(
                "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
            );
            expect(result.txHash).toBe(mockTxHash);
            expect(result.blockNumber).toBe(1000000n);
            expect(result.originContract).toBe(mockOpenLog.address);

            // EIP-7683 extended fields
            expect(result.destinationChainId).toBe(84532n); // Base Sepolia
            expect(result.inputAmount).toBe(1000000000000000000n); // 1 ETH
            expect(result.outputAmount).toBe(990000000000000000n); // 0.99 ETH
        });

        it("should throw OIFOpenEventNotFoundError when no Open event in receipt", async () => {
            const nonOpenLog: Log = {
                address: "0x5f9D51679F5A0C7C1e2b7F0aE8F2c3c7c9c1c2c3" as Address,
                blockHash: "0xaabbccdd" as Hex,
                blockNumber: 1000000n,
                data: "0x" as Hex,
                logIndex: 0,
                removed: false,
                topics: ["0xdifferentsignature" as Hex],
                transactionHash: mockTxHash,
                transactionIndex: 0,
            };

            vi.mocked(mockPublicClient.getTransactionReceipt).mockResolvedValue({
                logs: [nonOpenLog],
                blockNumber: 1000000n,
            } as unknown as ReturnType<PublicClient["getTransactionReceipt"]>);

            await expect(parser.getOpenedIntent(mockTxHash, mockChainId)).rejects.toThrow(
                OIFOpenEventNotFoundError,
            );
        });

        it("should throw OIFOpenEventNotFoundError when receipt has no logs", async () => {
            vi.mocked(mockPublicClient.getTransactionReceipt).mockResolvedValue({
                logs: [],
                blockNumber: 1000000n,
            } as unknown as ReturnType<PublicClient["getTransactionReceipt"]>);

            await expect(parser.getOpenedIntent(mockTxHash, mockChainId)).rejects.toThrow(
                OIFOpenEventNotFoundError,
            );
        });

        it("should find Open event among multiple logs", async () => {
            const otherLog: Log = {
                address: "0x1111111111111111111111111111111111111111" as Address,
                blockHash: "0xaabbccdd" as Hex,
                blockNumber: 1000000n,
                data: "0x" as Hex,
                logIndex: 0,
                removed: false,
                topics: ["0xothersignature" as Hex],
                transactionHash: mockTxHash,
                transactionIndex: 0,
            };

            const mockOpenLog = createMockOpenEventLog();

            vi.mocked(mockPublicClient.getTransactionReceipt).mockResolvedValue({
                logs: [otherLog, mockOpenLog, otherLog],
                blockNumber: 1000000n,
            } as unknown as ReturnType<PublicClient["getTransactionReceipt"]>);

            const result = await parser.getOpenedIntent(mockTxHash, mockChainId);

            expect(result.orderId).toBe(
                "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
            );
        });

        it("should use correct chain client", async () => {
            const mockOpenLog = createMockOpenEventLog();

            vi.mocked(mockPublicClient.getTransactionReceipt).mockResolvedValue({
                logs: [mockOpenLog],
                blockNumber: 1000000n,
            } as unknown as ReturnType<PublicClient["getTransactionReceipt"]>);

            await parser.getOpenedIntent(mockTxHash, mockChainId);

            expect(mockClientManager.getClient).toHaveBeenCalled();
        });

        it("should throw InvalidOpenEventError for malformed event data", async () => {
            // Create a log with the correct signature but invalid data
            const malformedLog: Log = {
                address: "0x5f9D51679F5A0C7C1e2b7F0aE8F2c3c7c9c1c2c3" as Address,
                blockHash: "0xaabbccdd" as Hex,
                blockNumber: 1000000n,
                data: "0x" as Hex, // Empty data will cause decode to fail
                logIndex: 0,
                removed: false,
                topics: [OPEN_EVENT_SIGNATURE as Hex], // Correct signature but missing orderId topic
                transactionHash: mockTxHash,
                transactionIndex: 0,
            };

            vi.mocked(mockPublicClient.getTransactionReceipt).mockResolvedValue({
                logs: [malformedLog],
                blockNumber: 1000000n,
            } as unknown as ReturnType<PublicClient["getTransactionReceipt"]>);

            await expect(parser.getOpenedIntent(mockTxHash, mockChainId)).rejects.toThrow(
                InvalidOpenEventError,
            );
        });
    });
});
