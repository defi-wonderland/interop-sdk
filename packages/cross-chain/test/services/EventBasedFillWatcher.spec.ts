import type viem from "viem";
import { AbiEvent, Address, createPublicClient, Hex, Log, PublicClient } from "viem";
import { baseSepolia, sepolia } from "viem/chains";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
    EventBasedFillWatcher,
    FillEvent,
    FillTimeoutError,
    FillWatcherConfig,
    GetFillParams,
} from "../../src/internal.js";
import { PublicClientManager } from "../../src/utils/publicClientManager.js";
import { createMockFillEvent, createMockLog } from "../mocks/intentTracking.js";

vi.mock("viem", async () => {
    return {
        ...(await vi.importActual<typeof viem>("viem")),
        createPublicClient: vi.fn(),
    };
});

describe("EventBasedFillWatcher", () => {
    let watcher: EventBasedFillWatcher;
    let mockGetLogs: ReturnType<typeof vi.fn>;
    let mockGetBlockNumber: ReturnType<typeof vi.fn>;
    let mockGetBlock: ReturnType<typeof vi.fn>;
    let mockPublicClient: PublicClient;
    let config: FillWatcherConfig;

    const mockContractAddress = "0x1234567890123456789012345678901234567890" as Address;
    const mockFillParams: GetFillParams = {
        originChainId: sepolia.id,
        destinationChainId: baseSepolia.id,
        depositId: 12345n,
        user: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as Address,
        fillDeadline: Math.floor(Date.now() / 1000) + 3600,
    };

    beforeEach(() => {
        vi.clearAllMocks();

        mockGetLogs = vi.fn();
        mockGetBlockNumber = vi.fn();
        mockGetBlock = vi.fn();

        mockPublicClient = {
            getLogs: mockGetLogs,
            getBlockNumber: mockGetBlockNumber,
            getBlock: mockGetBlock,
        } as unknown as PublicClient;

        vi.mocked(createPublicClient).mockReturnValue(mockPublicClient);

        config = {
            contractAddresses: {
                [mockFillParams.destinationChainId]: mockContractAddress,
            },
            eventAbi: [],
            buildLogsArgs: (
                params: GetFillParams,
            ): { address: Address; event: AbiEvent; args?: Record<string, unknown> } => ({
                address: mockContractAddress,
                event: {} as AbiEvent,
                args: {
                    originChainId: BigInt(params.originChainId),
                    depositId: params.depositId,
                },
            }),
            extractFillEvent: (log: Log, params: GetFillParams): FillEvent | null => {
                if (!log.transactionHash) return null;
                return createMockFillEvent({
                    fillTxHash: log.transactionHash,
                    blockNumber: log.blockNumber || 0n,
                    originChainId: params.originChainId,
                    depositId: params.depositId,
                });
            },
        };

        const clientManager = new PublicClientManager(mockPublicClient);
        watcher = new EventBasedFillWatcher(config, { clientManager });
    });

    afterEach(() => {
        vi.clearAllTimers();
        vi.useRealTimers();
    });

    describe("getFill", () => {
        it("should return null when no logs found", async () => {
            mockGetBlockNumber.mockResolvedValue(50000n);
            mockGetLogs.mockResolvedValue([]);

            const result = await watcher.getFill(mockFillParams);

            expect(result).toBeNull();
            expect(mockGetLogs).toHaveBeenCalledWith({
                address: mockContractAddress,
                event: expect.any(Object) as AbiEvent,
                args: {
                    originChainId: BigInt(mockFillParams.originChainId),
                    depositId: mockFillParams.depositId,
                },
                fromBlock: 10000n, // 50000 - 40000
                toBlock: "latest",
            });
        });

        it("should return FillEvent when fill exists with proper data extraction", async () => {
            const mockLog = createMockLog({
                transactionHash:
                    "0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321" as Hex,
                blockNumber: 2000000n,
            });

            mockGetBlockNumber.mockResolvedValue(50000n);
            mockGetLogs.mockResolvedValue([mockLog]);
            mockGetBlock.mockResolvedValue({ timestamp: 1234567890n });

            const result = await watcher.getFill(mockFillParams);

            expect(result).not.toBeNull();
            expect(result?.fillTxHash).toBe(mockLog.transactionHash);
            expect(result?.blockNumber).toBe(mockLog.blockNumber);
            expect(result?.originChainId).toBe(mockFillParams.originChainId);
            expect(result?.depositId).toBe(mockFillParams.depositId);
        });

        it("should query correct block range (current - 40000 blocks)", async () => {
            const currentBlock = 100000n;
            mockGetBlockNumber.mockResolvedValue(currentBlock);
            mockGetLogs.mockResolvedValue([]);

            await watcher.getFill(mockFillParams);

            expect(mockGetLogs).toHaveBeenCalledWith(
                expect.objectContaining({
                    fromBlock: 60000n, // 100000 - 40000
                    toBlock: "latest",
                }),
            );
        });

        it("should use block 0 when current block is less than max range", async () => {
            const currentBlock = 30000n;
            mockGetBlockNumber.mockResolvedValue(currentBlock);
            mockGetLogs.mockResolvedValue([]);

            await watcher.getFill(mockFillParams);

            expect(mockGetLogs).toHaveBeenCalledWith(
                expect.objectContaining({
                    fromBlock: 0n,
                    toBlock: "latest",
                }),
            );
        });

        it("should populate timestamp from block when event timestamp is 0", async () => {
            const mockLog = createMockLog({
                blockNumber: 2000000n,
            });

            const configWithZeroTimestamp: FillWatcherConfig = {
                ...config,
                extractFillEvent: (log: Log, params: GetFillParams) => {
                    if (!log.transactionHash) return null;
                    return createMockFillEvent({
                        fillTxHash: log.transactionHash,
                        blockNumber: log.blockNumber || 0n,
                        timestamp: 0, // Zero timestamp
                        originChainId: params.originChainId,
                        depositId: params.depositId,
                    });
                },
            };

            const clientManager = new PublicClientManager(mockPublicClient);
            const watcherWithZeroTimestamp = new EventBasedFillWatcher(configWithZeroTimestamp, {
                clientManager,
            });

            mockGetBlockNumber.mockResolvedValue(50000n);
            mockGetLogs.mockResolvedValue([mockLog]);
            mockGetBlock.mockResolvedValue({ timestamp: 1234567890n });

            const result = await watcherWithZeroTimestamp.getFill(mockFillParams);

            expect(result?.timestamp).toBe(1234567890);
            expect(mockGetBlock).toHaveBeenCalledWith({ blockNumber: mockLog.blockNumber });
        });

        it("should throw error when contract address not configured for chain", async () => {
            const unconfiguredParams: GetFillParams = {
                ...mockFillParams,
                destinationChainId: 999999,
            };

            await expect(watcher.getFill(unconfiguredParams)).rejects.toThrow(
                "Unsupported chain ID: 999999",
            );
        });

        it("should return null on RPC errors (verify error doesn't propagate)", async () => {
            mockGetBlockNumber.mockResolvedValue(50000n);
            mockGetLogs.mockRejectedValue(new Error("RPC request failed"));

            const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

            const result = await watcher.getFill(mockFillParams);

            expect(result).toBeNull();
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "Error querying fill events: RPC request failed",
            );

            consoleErrorSpy.mockRestore();
        });

        it("should handle logs without transactionHash gracefully", async () => {
            const mockLogWithoutTxHash = createMockLog({
                transactionHash: null,
            });

            mockGetBlockNumber.mockResolvedValue(50000n);
            mockGetLogs.mockResolvedValue([mockLogWithoutTxHash]);

            const result = await watcher.getFill(mockFillParams);

            expect(result).toBeNull();
        });

        it("should return null when getBlockNumber fails", async () => {
            mockGetBlockNumber.mockRejectedValue(new Error("Network error"));

            const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

            const result = await watcher.getFill(mockFillParams);

            expect(result).toBeNull();
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "Error querying fill events: Network error",
            );

            consoleErrorSpy.mockRestore();
        });

        it("should return null when getBlock fails during timestamp fetch", async () => {
            const mockLog = createMockLog({ blockNumber: 2000000n });

            const configWithZeroTimestamp: FillWatcherConfig = {
                ...config,
                extractFillEvent: (log: Log, params: GetFillParams) => {
                    if (!log.transactionHash) return null;
                    return createMockFillEvent({
                        fillTxHash: log.transactionHash,
                        blockNumber: log.blockNumber || 0n,
                        timestamp: 0,
                        originChainId: params.originChainId,
                        depositId: params.depositId,
                    });
                },
            };

            const clientManager = new PublicClientManager(mockPublicClient);
            const watcherWithZeroTimestamp = new EventBasedFillWatcher(configWithZeroTimestamp, {
                clientManager,
            });

            mockGetBlockNumber.mockResolvedValue(50000n);
            mockGetLogs.mockResolvedValue([mockLog]);
            mockGetBlock.mockRejectedValue(new Error("Block not found"));

            const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

            const result = await watcherWithZeroTimestamp.getFill(mockFillParams);

            expect(result).toBeNull();
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "Error querying fill events: Block not found",
            );

            consoleErrorSpy.mockRestore();
        });

        it("should return first fill event when multiple logs found", async () => {
            const firstLog = createMockLog({
                transactionHash:
                    "0xfirst00000000000000000000000000000000000000000000000000000000000" as Hex,
                blockNumber: 1000000n,
            });
            const secondLog = createMockLog({
                transactionHash:
                    "0xsecond0000000000000000000000000000000000000000000000000000000000" as Hex,
                blockNumber: 2000000n,
            });

            mockGetBlockNumber.mockResolvedValue(50000n);
            mockGetLogs.mockResolvedValue([firstLog, secondLog]);
            mockGetBlock.mockResolvedValue({ timestamp: 1234567890n });

            const result = await watcher.getFill(mockFillParams);

            expect(result).not.toBeNull();
            expect(result?.fillTxHash).toBe(firstLog.transactionHash);
            expect(result?.blockNumber).toBe(1000000n);
        });

        it("should return null when extractFillEvent returns null", async () => {
            const configThatReturnsNull: FillWatcherConfig = {
                ...config,
                extractFillEvent: () => null,
            };

            const clientManager = new PublicClientManager(mockPublicClient);
            const watcherWithNullExtractor = new EventBasedFillWatcher(configThatReturnsNull, {
                clientManager,
            });

            mockGetBlockNumber.mockResolvedValue(50000n);
            mockGetLogs.mockResolvedValue([createMockLog()]);

            const result = await watcherWithNullExtractor.getFill(mockFillParams);

            expect(result).toBeNull();
        });

        it("should use block 0 when current block equals max range", async () => {
            const currentBlock = 40000n;
            mockGetBlockNumber.mockResolvedValue(currentBlock);
            mockGetLogs.mockResolvedValue([]);

            await watcher.getFill(mockFillParams);

            expect(mockGetLogs).toHaveBeenCalledWith(
                expect.objectContaining({
                    fromBlock: 0n,
                    toBlock: "latest",
                }),
            );
        });
    });

    describe("waitForFill", () => {
        it("should throw error with less than or equal to zero timeout", async () => {
            await expect(watcher.waitForFill(mockFillParams, 0)).rejects.toThrow(
                "Timeout must be positive, got 0ms",
            );

            expect(mockGetLogs).not.toHaveBeenCalled();

            await expect(watcher.waitForFill(mockFillParams, -1000)).rejects.toThrow(
                "Timeout must be positive, got -1000ms",
            );

            expect(mockGetLogs).not.toHaveBeenCalled();
        });

        it("should return immediately when fill already exists", async () => {
            const mockFillEvent = createMockFillEvent();

            mockGetBlockNumber.mockResolvedValue(50000n);
            mockGetLogs.mockResolvedValue([createMockLog()]);
            mockGetBlock.mockResolvedValue({ timestamp: 1234567890n });

            const result = await watcher.waitForFill(mockFillParams, 10000);

            expect(result).toBeDefined();
            expect(result.fillTxHash).toBe(mockFillEvent.fillTxHash);
            expect(mockGetLogs).toHaveBeenCalledTimes(1);
        });

        it("should poll repeatedly (every 5s) until fill found", async () => {
            vi.useFakeTimers();

            mockGetBlockNumber.mockResolvedValue(50000n);

            mockGetLogs
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([createMockLog()]);

            mockGetBlock.mockResolvedValue({ timestamp: 1234567890n });

            const waitPromise = watcher.waitForFill(mockFillParams, 20000);

            for (let i = 0; i < 3; i++) {
                await vi.advanceTimersByTimeAsync(5000);
            }

            const result = await waitPromise;

            expect(result).toBeDefined();
            expect(mockGetLogs).toHaveBeenCalledTimes(3);
        });

        it("should throw FillTimeoutError after timeout expires", async () => {
            vi.useFakeTimers();

            mockGetBlockNumber.mockResolvedValue(50000n);
            mockGetLogs.mockResolvedValue([]);

            const timeout = 100;
            const waitPromise = watcher.waitForFill(mockFillParams, timeout);

            waitPromise.catch(() => {});

            await vi.runAllTimersAsync();

            await expect(waitPromise).rejects.toThrow(FillTimeoutError);
            await expect(waitPromise).rejects.toThrow(
                `Fill timeout after ${timeout}ms for depositId ${mockFillParams.depositId}`,
            );
        });

        it("should stop polling after fill is found (verify call count)", async () => {
            vi.useFakeTimers();

            mockGetBlockNumber.mockResolvedValue(50000n);
            mockGetLogs.mockResolvedValueOnce([]).mockResolvedValueOnce([createMockLog()]);
            mockGetBlock.mockResolvedValue({ timestamp: 1234567890n });

            const waitPromise = watcher.waitForFill(mockFillParams, 30000);

            await vi.advanceTimersByTimeAsync(5000);
            await vi.advanceTimersByTimeAsync(5000);

            const result = await waitPromise;

            expect(result).toBeDefined();
            expect(mockGetLogs).toHaveBeenCalledTimes(2);

            await vi.advanceTimersByTimeAsync(10000);

            expect(mockGetLogs).toHaveBeenCalledTimes(2);
        });
    });
});
