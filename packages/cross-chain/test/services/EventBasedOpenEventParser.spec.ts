import type viem from "viem";
import { Address, createPublicClient, Hex, Log, PublicClient } from "viem";
import { sepolia } from "viem/chains";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    EventBasedOpenEventParser,
    OpenEvent,
    OpenEventParserConfig,
    ProtocolOpenEventNotFoundError,
} from "../../src/internal.js";
import { PublicClientManager } from "../../src/utils/publicClientManager.js";

vi.mock("viem", async () => {
    return {
        ...(await vi.importActual<typeof viem>("viem")),
        createPublicClient: vi.fn(),
    };
});

describe("EventBasedOpenEventParser", () => {
    let parser: EventBasedOpenEventParser;
    let mockGetTransactionReceipt: ReturnType<typeof vi.fn>;
    let mockPublicClient: PublicClient;
    let config: OpenEventParserConfig;

    const mockEventSignature =
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as Hex;
    const mockTxHash = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890" as Hex;
    const mockSettlementContract = "0x5f9D51679F5A0C7C1e2b7F0aE8F2c3c7c9c1c2c3" as Address;

    beforeEach(() => {
        vi.clearAllMocks();

        mockGetTransactionReceipt = vi.fn();

        mockPublicClient = {
            getTransactionReceipt: mockGetTransactionReceipt,
        } as unknown as PublicClient;

        vi.mocked(createPublicClient).mockReturnValue(mockPublicClient);

        config = {
            protocolName: "TestProtocol",
            eventSignature: mockEventSignature,
            extractOpenEvent: (log: Log, txHash: Hex, chainId: number): OpenEvent => ({
                orderId: (log.topics[1] ||
                    "0x0000000000000000000000000000000000000000000000000000000000000000") as Hex,
                resolvedOrder: {
                    user: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as Address,
                    originChainId: BigInt(chainId),
                    openDeadline: 1700000000,
                    fillDeadline: 1700003600,
                    orderId: (log.topics[1] ||
                        "0x0000000000000000000000000000000000000000000000000000000000000000") as Hex,
                },
                settlementContract: log.address,
                txHash,
                blockNumber: log.blockNumber || 0n,
            }),
        };

        const clientManager = new PublicClientManager(mockPublicClient);
        parser = new EventBasedOpenEventParser(config, { clientManager });
    });

    describe("getOpenEvent", () => {
        it("should extract open event when event found", async () => {
            const mockLog: Log = {
                address: mockSettlementContract,
                blockHash: "0xaabbccdd" as Hex,
                blockNumber: 1000000n,
                data: "0x",
                logIndex: 0,
                removed: false,
                topics: [
                    mockEventSignature,
                    "0x00000000000000000000000000000000000000000000000000000000000000ff" as Hex,
                ],
                transactionHash: mockTxHash,
                transactionIndex: 0,
            };

            mockGetTransactionReceipt.mockResolvedValue({
                logs: [mockLog],
                blockNumber: 1000000n,
            });

            const result = await parser.getOpenEvent(mockTxHash, sepolia.id);

            expect(result.orderId).toBe(
                "0x00000000000000000000000000000000000000000000000000000000000000ff",
            );
            expect(result.settlementContract).toBe(mockSettlementContract);
            expect(result.txHash).toBe(mockTxHash);
            expect(result.blockNumber).toBe(1000000n);
            expect(result.resolvedOrder.originChainId).toBe(BigInt(sepolia.id));
        });

        it("should throw ProtocolOpenEventNotFoundError when event missing", async () => {
            mockGetTransactionReceipt.mockResolvedValue({
                logs: [],
                blockNumber: 1000000n,
            });

            const error = await parser.getOpenEvent(mockTxHash, sepolia.id).catch((e: Error) => e);

            expect(error).toBeInstanceOf(ProtocolOpenEventNotFoundError);
            expect(error.message).toBe(
                `TestProtocol open event not found in transaction ${mockTxHash}`,
            );
        });

        it("should throw error for unsupported chain", async () => {
            const unsupportedChainId = 999999;

            await expect(parser.getOpenEvent(mockTxHash, unsupportedChainId)).rejects.toThrow(
                "Unsupported chain ID",
            );
        });

        it("should find correct event among multiple logs", async () => {
            const otherEventSignature =
                "0x9999999999999999999999999999999999999999999999999999999999999999" as Hex;

            const otherLog: Log = {
                address: mockSettlementContract,
                blockHash: "0xaabbccdd" as Hex,
                blockNumber: 1000000n,
                data: "0x",
                logIndex: 0,
                removed: false,
                topics: [otherEventSignature],
                transactionHash: mockTxHash,
                transactionIndex: 0,
            };

            const openLog: Log = {
                address: mockSettlementContract,
                blockHash: "0xaabbccdd" as Hex,
                blockNumber: 1000000n,
                data: "0x",
                logIndex: 1,
                removed: false,
                topics: [
                    mockEventSignature,
                    "0x00000000000000000000000000000000000000000000000000000000000000aa" as Hex,
                ],
                transactionHash: mockTxHash,
                transactionIndex: 0,
            };

            mockGetTransactionReceipt.mockResolvedValue({
                logs: [otherLog, openLog],
                blockNumber: 1000000n,
            });

            const result = await parser.getOpenEvent(mockTxHash, sepolia.id);

            expect(result.orderId).toBe(
                "0x00000000000000000000000000000000000000000000000000000000000000aa",
            );
        });

        it("should call extractOpenEvent from config with correct arguments", async () => {
            const extractSpy = vi.fn().mockReturnValue({
                orderId: "0x9999" as Hex,
                resolvedOrder: {
                    user: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as Address,
                    originChainId: BigInt(sepolia.id),
                    openDeadline: 1700000000,
                    fillDeadline: 1700003600,
                    orderId: "0x9999" as Hex,
                },
                settlementContract: mockSettlementContract,
                txHash: mockTxHash,
                blockNumber: 1000000n,
            });

            const customConfig: OpenEventParserConfig = {
                ...config,
                extractOpenEvent: extractSpy,
            };

            const clientManager = new PublicClientManager(mockPublicClient);
            const customParser = new EventBasedOpenEventParser(customConfig, { clientManager });

            const mockLog: Log = {
                address: mockSettlementContract,
                blockHash: "0xaabbccdd" as Hex,
                blockNumber: 1000000n,
                data: "0x",
                logIndex: 0,
                removed: false,
                topics: [mockEventSignature],
                transactionHash: mockTxHash,
                transactionIndex: 0,
            };

            mockGetTransactionReceipt.mockResolvedValue({
                logs: [mockLog],
                blockNumber: 1000000n,
            });

            const result = await customParser.getOpenEvent(mockTxHash, sepolia.id);

            expect(extractSpy).toHaveBeenCalledWith(mockLog, mockTxHash, sepolia.id);
            expect(result.orderId).toBe("0x9999");
        });

        it("should throw error when getTransactionReceipt fails", async () => {
            mockGetTransactionReceipt.mockRejectedValue(new Error("RPC error"));

            await expect(parser.getOpenEvent(mockTxHash, sepolia.id)).rejects.toThrow("RPC error");
        });
    });
});
