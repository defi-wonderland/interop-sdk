import { Address, Hex, Log, PublicClient } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    CustomEventOpenedIntentParser,
    CustomEventOpenedIntentParserConfig,
    OpenedIntent,
    OpenedIntentNotFoundError,
    PublicClientManager,
} from "../../src/internal.js";

const MOCK_EVENT_SIGNATURE =
    "0x32ed1a409ef04c7b0227189c3a103dc5ac10e775a15b785dcc510201f7c25ad3" as Hex;

const createMockConfig = (): CustomEventOpenedIntentParserConfig => ({
    protocolName: "test-protocol",
    eventSignature: MOCK_EVENT_SIGNATURE,
    extractOpenedIntent: (log: Log, txHash: Hex, blockNumber: bigint): OpenedIntent => ({
        orderId: "0x0000000000000000000000000000000000000000000000000000000000003039" as Hex,
        txHash,
        blockNumber,
        originContract: log.address,
        user: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as Address,
        fillDeadline: 1700003600,
        depositId: 12345n,
        destinationChainId: 84532n,
        inputAmount: 1000000000000000000n,
        outputAmount: 990000000000000000n,
    }),
});

describe("CustomEventOpenedIntentParser", () => {
    let parser: CustomEventOpenedIntentParser;
    let mockClientManager: PublicClientManager;
    let mockPublicClient: PublicClient;
    let mockConfig: CustomEventOpenedIntentParserConfig;

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

        mockConfig = createMockConfig();

        parser = new CustomEventOpenedIntentParser(mockConfig, {
            clientManager: mockClientManager,
        });
    });

    describe("getOpenedIntent", () => {
        it("should parse custom event and return OpenedIntent", async () => {
            const mockLog: Log = {
                address: "0x5f9D51679F5A0C7C1e2b7F0aE8F2c3c7c9c1c2c3" as Address,
                blockHash:
                    "0xaabbccdd1234567890aabbccdd1234567890aabbccdd1234567890aabbccdd12" as Hex,
                blockNumber: 1000000n,
                data: "0x" as Hex,
                logIndex: 0,
                removed: false,
                topics: [MOCK_EVENT_SIGNATURE],
                transactionHash: mockTxHash,
                transactionIndex: 0,
            };

            vi.mocked(mockPublicClient.getTransactionReceipt).mockResolvedValue({
                logs: [mockLog],
                blockNumber: 1000000n,
            } as unknown as ReturnType<PublicClient["getTransactionReceipt"]>);

            const result = await parser.getOpenedIntent(mockTxHash, mockChainId);

            expect(result.depositId).toBe(12345n);
            expect(result.inputAmount).toBe(1000000000000000000n);
            expect(result.outputAmount).toBe(990000000000000000n);
            expect(result.destinationChainId).toBe(84532n);
            expect(result.txHash).toBe(mockTxHash);
            expect(result.blockNumber).toBe(1000000n);
        });

        it("should throw OpenedIntentNotFoundError when event not found", async () => {
            const wrongLog: Log = {
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
                logs: [wrongLog],
                blockNumber: 1000000n,
            } as unknown as ReturnType<PublicClient["getTransactionReceipt"]>);

            await expect(parser.getOpenedIntent(mockTxHash, mockChainId)).rejects.toThrow(
                OpenedIntentNotFoundError,
            );
        });

        it("should throw OpenedIntentNotFoundError with protocol name", async () => {
            vi.mocked(mockPublicClient.getTransactionReceipt).mockResolvedValue({
                logs: [],
                blockNumber: 1000000n,
            } as unknown as ReturnType<PublicClient["getTransactionReceipt"]>);

            await expect(parser.getOpenedIntent(mockTxHash, mockChainId)).rejects.toThrow(
                "test-protocol opened intent event not found",
            );
        });

        it("should find matching event among multiple logs", async () => {
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

            const matchingLog: Log = {
                address: "0x5f9D51679F5A0C7C1e2b7F0aE8F2c3c7c9c1c2c3" as Address,
                blockHash: "0xaabbccdd" as Hex,
                blockNumber: 1000000n,
                data: "0x" as Hex,
                logIndex: 1,
                removed: false,
                topics: [MOCK_EVENT_SIGNATURE],
                transactionHash: mockTxHash,
                transactionIndex: 0,
            };

            vi.mocked(mockPublicClient.getTransactionReceipt).mockResolvedValue({
                logs: [otherLog, matchingLog, otherLog],
                blockNumber: 1000000n,
            } as unknown as ReturnType<PublicClient["getTransactionReceipt"]>);

            const result = await parser.getOpenedIntent(mockTxHash, mockChainId);

            expect(result.depositId).toBe(12345n);
        });

        it("should call extractOpenedIntent with correct parameters", async () => {
            const extractSpy = vi.fn().mockReturnValue({
                orderId:
                    "0x0000000000000000000000000000000000000000000000000000000000003039" as Hex,
                txHash: mockTxHash,
                blockNumber: 1000000n,
                originContract: "0x5f9D51679F5A0C7C1e2b7F0aE8F2c3c7c9c1c2c3" as Address,
                user: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as Address,
                fillDeadline: 1700003600,
                depositId: 12345n,
                destinationChainId: 84532n,
                inputAmount: 1000000000000000000n,
                outputAmount: 990000000000000000n,
            });

            const configWithSpy: CustomEventOpenedIntentParserConfig = {
                ...mockConfig,
                extractOpenedIntent: extractSpy,
            };

            const parserWithSpy = new CustomEventOpenedIntentParser(configWithSpy, {
                clientManager: mockClientManager,
            });

            const mockLog: Log = {
                address: "0x5f9D51679F5A0C7C1e2b7F0aE8F2c3c7c9c1c2c3" as Address,
                blockHash: "0xaabbccdd" as Hex,
                blockNumber: 1000000n,
                data: "0x" as Hex,
                logIndex: 0,
                removed: false,
                topics: [MOCK_EVENT_SIGNATURE],
                transactionHash: mockTxHash,
                transactionIndex: 0,
            };

            vi.mocked(mockPublicClient.getTransactionReceipt).mockResolvedValue({
                logs: [mockLog],
                blockNumber: 1000000n,
            } as unknown as ReturnType<PublicClient["getTransactionReceipt"]>);

            await parserWithSpy.getOpenedIntent(mockTxHash, mockChainId);

            expect(extractSpy).toHaveBeenCalledWith(mockLog, mockTxHash, 1000000n);
        });

        it("should use correct chain client", async () => {
            const mockLog: Log = {
                address: "0x5f9D51679F5A0C7C1e2b7F0aE8F2c3c7c9c1c2c3" as Address,
                blockHash: "0xaabbccdd" as Hex,
                blockNumber: 1000000n,
                data: "0x" as Hex,
                logIndex: 0,
                removed: false,
                topics: [MOCK_EVENT_SIGNATURE],
                transactionHash: mockTxHash,
                transactionIndex: 0,
            };

            vi.mocked(mockPublicClient.getTransactionReceipt).mockResolvedValue({
                logs: [mockLog],
                blockNumber: 1000000n,
            } as unknown as ReturnType<PublicClient["getTransactionReceipt"]>);

            await parser.getOpenedIntent(mockTxHash, mockChainId);

            expect(mockClientManager.getClient).toHaveBeenCalled();
        });
    });
});
