import type viem from "viem";
import { Address, createPublicClient, decodeEventLog, Hex, Log, PublicClient } from "viem";
import { sepolia } from "viem/chains";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OPEN_EVENT_SIGNATURE } from "../../src/constants/openIntentFramework.js";
import {
    InvalidOpenEventError,
    OpenEventNotFoundError,
    OpenEventWatcher,
} from "../../src/services/OpenEventWatcher.js";
import { PublicClientManager } from "../../src/utils/publicClientManager.js";

vi.mock("viem", async () => {
    return {
        ...(await vi.importActual<typeof viem>("viem")),
        createPublicClient: vi.fn(),
        decodeEventLog: vi.fn(),
    };
});

describe("OpenEventWatcher", () => {
    let watcher: OpenEventWatcher;
    let mockGetTransactionReceipt: ReturnType<typeof vi.fn>;
    let mockGetBlockNumber: ReturnType<typeof vi.fn>;
    let mockDecodeEventLog: ReturnType<typeof vi.fn>;

    const mockTxHash = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890" as Hex;

    beforeEach(() => {
        vi.clearAllMocks();

        mockGetTransactionReceipt = vi.fn();
        mockGetBlockNumber = vi.fn();
        mockDecodeEventLog = vi.fn();

        const mockPublicClient = {
            getTransactionReceipt: mockGetTransactionReceipt,
            getBlockNumber: mockGetBlockNumber,
        } as unknown as PublicClient;

        vi.mocked(createPublicClient).mockReturnValue(mockPublicClient);
        vi.mocked(decodeEventLog).mockImplementation(mockDecodeEventLog);

        const clientManager = new PublicClientManager(mockPublicClient);
        watcher = new OpenEventWatcher({ clientManager });
    });

    describe("getOpenEvent", () => {
        it("should throw OpenEventNotFoundError when Open event is missing", async () => {
            mockGetTransactionReceipt.mockResolvedValue({
                logs: [],
                blockNumber: 123n,
            });

            await expect(watcher.getOpenEvent(mockTxHash, sepolia.id)).rejects.toThrow(
                OpenEventNotFoundError,
            );
            await expect(watcher.getOpenEvent(mockTxHash, sepolia.id)).rejects.toThrow(
                `Open event not found in transaction ${mockTxHash}`,
            );
        });

        it("should throw error for unsupported chain", async () => {
            const unsupportedChainId = 999999;

            await expect(watcher.getOpenEvent(mockTxHash, unsupportedChainId)).rejects.toThrow(
                "Unsupported chain ID",
            );
        });

        it("should parse Open event with valid data", async () => {
            const mockLog: Log = {
                address: "0x5f9D51679F5A0C7C1e2b7F0aE8F2c3c7c9c1c2c3" as Address,
                blockHash: "0xaabbccdd" as Hex,
                blockNumber: 1000000n,
                data: "0x",
                logIndex: 0,
                removed: false,
                topics: [OPEN_EVENT_SIGNATURE],
                transactionHash: mockTxHash,
                transactionIndex: 0,
            };

            mockGetTransactionReceipt.mockResolvedValue({
                logs: [mockLog],
                blockNumber: 1000000n,
            });

            const mockOrderId =
                "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as Hex;
            const mockUser = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as Address;

            mockDecodeEventLog.mockReturnValue({
                args: {
                    orderId: mockOrderId,
                    resolvedOrder: {
                        user: mockUser,
                        originChainId: 11155111n,
                        openDeadline: 1234567890,
                        fillDeadline: 1234567900,
                        orderId: mockOrderId,
                    },
                },
            });

            const result = await watcher.getOpenEvent(mockTxHash, sepolia.id);

            expect(result.orderId).toBe(mockOrderId);
            expect(result.resolvedOrder.user).toBe(mockUser);
            expect(result.resolvedOrder.originChainId).toBe(11155111n);
            expect(result.settlementContract).toBe(mockLog.address);
            expect(result.txHash).toBe(mockTxHash);
            expect(result.blockNumber).toBe(1000000n);
        });

        it("should throw InvalidOpenEventError for missing orderId", async () => {
            const mockLog: Log = {
                address: "0x5f9D51679F5A0C7C1e2b7F0aE8F2c3c7c9c1c2c3" as Address,
                blockHash: "0xaabbccdd" as Hex,
                blockNumber: 1000000n,
                data: "0x",
                logIndex: 0,
                removed: false,
                topics: [OPEN_EVENT_SIGNATURE],
                transactionHash: mockTxHash,
                transactionIndex: 0,
            };

            mockGetTransactionReceipt.mockResolvedValue({
                logs: [mockLog],
                blockNumber: 1000000n,
            });

            mockDecodeEventLog.mockReturnValue({
                args: {
                    orderId: null,
                    resolvedOrder: {
                        user: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as Address,
                    },
                },
            });

            await expect(watcher.getOpenEvent(mockTxHash, sepolia.id)).rejects.toThrow(
                InvalidOpenEventError,
            );
            await expect(watcher.getOpenEvent(mockTxHash, sepolia.id)).rejects.toThrow(
                "Missing orderId or resolvedOrder",
            );
        });

        it("should throw InvalidOpenEventError for missing resolvedOrder", async () => {
            const mockLog: Log = {
                address: "0x5f9D51679F5A0C7C1e2b7F0aE8F2c3c7c9c1c2c3" as Address,
                blockHash: "0xaabbccdd" as Hex,
                blockNumber: 1000000n,
                data: "0x",
                logIndex: 0,
                removed: false,
                topics: [OPEN_EVENT_SIGNATURE],
                transactionHash: mockTxHash,
                transactionIndex: 0,
            };

            mockGetTransactionReceipt.mockResolvedValue({
                logs: [mockLog],
                blockNumber: 1000000n,
            });

            mockDecodeEventLog.mockReturnValue({
                args: {
                    orderId: "0x1234" as Hex,
                    resolvedOrder: null,
                },
            });

            await expect(watcher.getOpenEvent(mockTxHash, sepolia.id)).rejects.toThrow(
                InvalidOpenEventError,
            );
        });

        it("should throw InvalidOpenEventError when decodeEventLog fails", async () => {
            const mockLog: Log = {
                address: "0x5f9D51679F5A0C7C1e2b7F0aE8F2c3c7c9c1c2c3" as Address,
                blockHash: "0xaabbccdd" as Hex,
                blockNumber: 1000000n,
                data: "0x",
                logIndex: 0,
                removed: false,
                topics: [OPEN_EVENT_SIGNATURE],
                transactionHash: mockTxHash,
                transactionIndex: 0,
            };

            mockGetTransactionReceipt.mockResolvedValue({
                logs: [mockLog],
                blockNumber: 1000000n,
            });

            mockDecodeEventLog.mockImplementation(() => {
                throw new Error("Decoding failed");
            });

            await expect(watcher.getOpenEvent(mockTxHash, sepolia.id)).rejects.toThrow(
                InvalidOpenEventError,
            );
            await expect(watcher.getOpenEvent(mockTxHash, sepolia.id)).rejects.toThrow(
                "Decoding failed",
            );
        });

        it("should find Open event among multiple logs", async () => {
            const otherLog: Log = {
                address: "0x1111111111111111111111111111111111111111" as Address,
                blockHash: "0xaabbccdd" as Hex,
                blockNumber: 1000000n,
                data: "0x",
                logIndex: 0,
                removed: false,
                topics: [
                    "0x9999999999999999999999999999999999999999999999999999999999999999" as Hex,
                ],
                transactionHash: mockTxHash,
                transactionIndex: 0,
            };

            const openLog: Log = {
                address: "0x5f9D51679F5A0C7C1e2b7F0aE8F2c3c7c9c1c2c3" as Address,
                blockHash: "0xaabbccdd" as Hex,
                blockNumber: 1000000n,
                data: "0x",
                logIndex: 1,
                removed: false,
                topics: [OPEN_EVENT_SIGNATURE],
                transactionHash: mockTxHash,
                transactionIndex: 0,
            };

            mockGetTransactionReceipt.mockResolvedValue({
                logs: [otherLog, openLog],
                blockNumber: 1000000n,
            });

            const mockOrderId =
                "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as Hex;

            mockDecodeEventLog.mockReturnValue({
                args: {
                    orderId: mockOrderId,
                    resolvedOrder: {
                        user: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as Address,
                        originChainId: 11155111n,
                        openDeadline: 1234567890,
                        fillDeadline: 1234567900,
                        orderId: mockOrderId,
                    },
                },
            });

            const result = await watcher.getOpenEvent(mockTxHash, sepolia.id);

            expect(result.orderId).toBe(mockOrderId);
            expect(result.settlementContract).toBe(openLog.address);
        });

        it("should throw error when getTransactionReceipt fails", async () => {
            mockGetTransactionReceipt.mockRejectedValue(new Error("RPC error"));

            await expect(watcher.getOpenEvent(mockTxHash, sepolia.id)).rejects.toThrow("RPC error");
        });
    });
});
