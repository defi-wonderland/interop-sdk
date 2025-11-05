import { Hex } from "viem";
import { baseSepolia, sepolia } from "viem/chains";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
    DepositInfoParser,
    FillWatcher,
    IntentTracker,
    IntentUpdate,
    OpenEventWatcher,
    WatchIntentParams,
} from "../../src/internal.js";
import { FillTimeoutError } from "../../src/services/EventBasedFillWatcher.js";
import {
    createMockDepositInfo,
    createMockFillEvent,
    createMockOpenEvent,
} from "../mocks/intentTracking.js";

describe("IntentTracker", () => {
    let tracker: IntentTracker;
    let mockOpenWatcher: OpenEventWatcher;
    let mockDepositInfoParser: DepositInfoParser;
    let mockFillWatcher: FillWatcher;

    const mockTxHash = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890" as Hex;
    const mockOriginChainId = sepolia.id;
    const mockDestinationChainId = baseSepolia.id;

    beforeEach(() => {
        vi.clearAllMocks();

        mockOpenWatcher = {
            getOpenEvent: vi.fn(),
        } as unknown as OpenEventWatcher;

        mockDepositInfoParser = {
            getDepositInfo: vi.fn(),
        } as unknown as DepositInfoParser;

        mockFillWatcher = {
            getFill: vi.fn(),
            waitForFill: vi.fn(),
        } as unknown as FillWatcher;

        tracker = new IntentTracker(mockOpenWatcher, mockDepositInfoParser, mockFillWatcher);
    });

    afterEach(() => {
        vi.clearAllTimers();
        vi.useRealTimers();
    });

    describe("getIntentStatus", () => {
        it('should return "filled" status when fill event exists', async () => {
            const mockOpenEvent = createMockOpenEvent();
            const mockDepositInfo = createMockDepositInfo();
            const mockFillEventData = createMockFillEvent();

            vi.mocked(mockOpenWatcher.getOpenEvent).mockResolvedValue(mockOpenEvent);
            vi.mocked(mockDepositInfoParser.getDepositInfo).mockResolvedValue(mockDepositInfo);
            vi.mocked(mockFillWatcher.getFill).mockResolvedValue(mockFillEventData);

            const result = await tracker.getIntentStatus(mockTxHash, mockOriginChainId);

            expect(result.status).toBe("filled");
            expect(result.orderId).toBe(mockOpenEvent.orderId);
            expect(result.fillEvent).toEqual(mockFillEventData);
            expect(result.depositInfo).toEqual(mockDepositInfo);
        });

        it('should return "expired" when past fillDeadline with no fill', async () => {
            const expiredDeadline = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
            const mockOpenEvent = createMockOpenEvent({
                resolvedOrder: {
                    ...createMockOpenEvent().resolvedOrder,
                    fillDeadline: expiredDeadline,
                },
            });
            const mockDepositInfo = createMockDepositInfo();

            vi.mocked(mockOpenWatcher.getOpenEvent).mockResolvedValue(mockOpenEvent);
            vi.mocked(mockDepositInfoParser.getDepositInfo).mockResolvedValue(mockDepositInfo);
            vi.mocked(mockFillWatcher.getFill).mockResolvedValue(null);

            const result = await tracker.getIntentStatus(mockTxHash, mockOriginChainId);

            expect(result.status).toBe("expired");
            expect(result.fillEvent).toBeUndefined();
        });

        it('should return "filling" when before fillDeadline with no fill', async () => {
            const futureDeadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
            const mockOpenEvent = createMockOpenEvent({
                resolvedOrder: {
                    ...createMockOpenEvent().resolvedOrder,
                    fillDeadline: futureDeadline,
                },
            });
            const mockDepositInfo = createMockDepositInfo();

            vi.mocked(mockOpenWatcher.getOpenEvent).mockResolvedValue(mockOpenEvent);
            vi.mocked(mockDepositInfoParser.getDepositInfo).mockResolvedValue(mockDepositInfo);
            vi.mocked(mockFillWatcher.getFill).mockResolvedValue(null);

            const result = await tracker.getIntentStatus(mockTxHash, mockOriginChainId);

            expect(result.status).toBe("filling");
            expect(result.fillEvent).toBeUndefined();
        });

        it("should correctly combine data from all three dependencies", async () => {
            const mockOpenEvent = createMockOpenEvent({
                orderId:
                    "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as Hex,
            });
            const mockDepositInfo = createMockDepositInfo({
                depositId: 99999n,
                destinationChainId: BigInt(mockDestinationChainId),
            });
            const mockFillEventData = createMockFillEvent({
                depositId: 99999n,
            });

            vi.mocked(mockOpenWatcher.getOpenEvent).mockResolvedValue(mockOpenEvent);
            vi.mocked(mockDepositInfoParser.getDepositInfo).mockResolvedValue(mockDepositInfo);
            vi.mocked(mockFillWatcher.getFill).mockResolvedValue(mockFillEventData);

            const result = await tracker.getIntentStatus(mockTxHash, mockOriginChainId);

            expect(result.orderId).toBe(mockOpenEvent.orderId);
            expect(result.user).toBe(mockOpenEvent.resolvedOrder.user);
            expect(result.fillDeadline).toBe(mockOpenEvent.resolvedOrder.fillDeadline);

            expect(result.depositInfo).toEqual(mockDepositInfo);
            expect(result.destinationChainId).toBe(Number(mockDepositInfo.destinationChainId));

            expect(result.fillEvent).toEqual(mockFillEventData);

            expect(result.openTxHash).toBe(mockTxHash);
            expect(result.originChainId).toBe(mockOriginChainId);
        });

        it("should handle edge case: exactly at deadline boundary", async () => {
            const currentTime = Math.floor(Date.now() / 1000);
            const mockOpenEvent = createMockOpenEvent({
                resolvedOrder: {
                    ...createMockOpenEvent().resolvedOrder,
                    fillDeadline: currentTime,
                },
            });
            const mockDepositInfo = createMockDepositInfo();

            vi.mocked(mockOpenWatcher.getOpenEvent).mockResolvedValue(mockOpenEvent);
            vi.mocked(mockDepositInfoParser.getDepositInfo).mockResolvedValue(mockDepositInfo);
            vi.mocked(mockFillWatcher.getFill).mockResolvedValue(null);

            const result = await tracker.getIntentStatus(mockTxHash, mockOriginChainId);

            expect(result.status).toBe("filling");
        });
    });

    describe("watchIntent - async generator", () => {
        it("should emit correct sequence: opening → opened → filling → filled", async () => {
            const mockOpenEvent = createMockOpenEvent();
            const mockDepositInfo = createMockDepositInfo({
                destinationChainId: BigInt(mockDestinationChainId),
            });
            const mockFillEventData = createMockFillEvent();

            vi.mocked(mockOpenWatcher.getOpenEvent).mockResolvedValue(mockOpenEvent);
            vi.mocked(mockDepositInfoParser.getDepositInfo).mockResolvedValue(mockDepositInfo);
            vi.mocked(mockFillWatcher.waitForFill).mockResolvedValue(mockFillEventData);

            const params: WatchIntentParams = {
                txHash: mockTxHash,
                originChainId: mockOriginChainId,
                destinationChainId: mockDestinationChainId,
                timeout: 10000,
            };

            const updates = [];
            for await (const update of tracker.watchIntent(params)) {
                updates.push(update);
            }

            expect(updates).toHaveLength(4);
            expect(updates[0]?.status).toBe("opening");
            expect(updates[1]?.status).toBe("opened");
            expect(updates[2]?.status).toBe("filling");
            expect(updates[3]?.status).toBe("filled");

            expect(updates[3]?.fillTxHash).toBe(mockFillEventData.fillTxHash);
        });

        it("should emit expired if already past deadline before watching (with GRACE_PERIOD)", async () => {
            const expiredDeadline = Math.floor(Date.now() / 1000) - 120; // 2 minutes ago
            const mockOpenEvent = createMockOpenEvent({
                resolvedOrder: {
                    ...createMockOpenEvent().resolvedOrder,
                    fillDeadline: expiredDeadline,
                },
            });
            const mockDepositInfo = createMockDepositInfo({
                destinationChainId: BigInt(mockDestinationChainId),
            });

            vi.mocked(mockOpenWatcher.getOpenEvent).mockResolvedValue(mockOpenEvent);
            vi.mocked(mockDepositInfoParser.getDepositInfo).mockResolvedValue(mockDepositInfo);

            const params: WatchIntentParams = {
                txHash: mockTxHash,
                originChainId: mockOriginChainId,
                destinationChainId: mockDestinationChainId,
            };

            const updates = [];
            for await (const update of tracker.watchIntent(params)) {
                updates.push(update);
            }

            expect(updates).toHaveLength(3);
            expect(updates[0]?.status).toBe("opening");
            expect(updates[1]?.status).toBe("opened");
            expect(updates[2]?.status).toBe("expired");
            expect(updates[2]?.message).toContain("expired before watching started");
        });

        it("should NOT emit expired if within GRACE_PERIOD (deadline recently passed)", async () => {
            const recentDeadline = Math.floor(Date.now() / 1000) - 30;
            const mockOpenEvent = createMockOpenEvent({
                resolvedOrder: {
                    ...createMockOpenEvent().resolvedOrder,
                    fillDeadline: recentDeadline,
                },
            });
            const mockDepositInfo = createMockDepositInfo({
                destinationChainId: BigInt(mockDestinationChainId),
            });
            const mockFillEventData = createMockFillEvent();

            vi.mocked(mockOpenWatcher.getOpenEvent).mockResolvedValue(mockOpenEvent);
            vi.mocked(mockDepositInfoParser.getDepositInfo).mockResolvedValue(mockDepositInfo);
            vi.mocked(mockFillWatcher.waitForFill).mockResolvedValue(mockFillEventData);

            const params: WatchIntentParams = {
                txHash: mockTxHash,
                originChainId: mockOriginChainId,
                destinationChainId: mockDestinationChainId,
            };

            const updates = [];
            for await (const update of tracker.watchIntent(params)) {
                updates.push(update);
            }

            expect(updates).toHaveLength(4);
            expect(updates[0]?.status).toBe("opening");
            expect(updates[1]?.status).toBe("opened");
            expect(updates[2]?.status).toBe("filling");
            expect(updates[3]?.status).toBe("filled");

            expect(mockFillWatcher.waitForFill).toHaveBeenCalled();
        });

        it("should emit expired if deadline passes during fill wait", async () => {
            const expiredDeadline = Math.floor(Date.now() / 1000) - 10; // 10 seconds ago
            const mockOpenEvent = createMockOpenEvent({
                resolvedOrder: {
                    ...createMockOpenEvent().resolvedOrder,
                    fillDeadline: expiredDeadline,
                    openDeadline: expiredDeadline - 100,
                },
            });
            const mockDepositInfo = createMockDepositInfo({
                destinationChainId: BigInt(mockDestinationChainId),
            });

            vi.mocked(mockOpenWatcher.getOpenEvent).mockResolvedValue(mockOpenEvent);
            vi.mocked(mockDepositInfoParser.getDepositInfo).mockResolvedValue(mockDepositInfo);

            // Simulate FillTimeoutError - deadline already passed
            vi.mocked(mockFillWatcher.waitForFill).mockRejectedValue(
                new FillTimeoutError(mockDepositInfo.depositId, 10000),
            );

            const params: WatchIntentParams = {
                txHash: mockTxHash,
                originChainId: mockOriginChainId,
                destinationChainId: mockDestinationChainId,
                timeout: 10000,
            };

            const updates = [];
            for await (const update of tracker.watchIntent(params)) {
                updates.push(update);
            }

            expect(updates).toHaveLength(4);
            expect(updates[3]?.status).toBe("expired");
            expect(updates[3]?.message).toContain("expired before fill");
        });

        it("should emit filling status on timeout with helpful message", async () => {
            const futureDeadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
            const mockOpenEvent = createMockOpenEvent({
                resolvedOrder: {
                    ...createMockOpenEvent().resolvedOrder,
                    fillDeadline: futureDeadline,
                },
            });
            const mockDepositInfo = createMockDepositInfo({
                destinationChainId: BigInt(mockDestinationChainId),
            });

            vi.mocked(mockOpenWatcher.getOpenEvent).mockResolvedValue(mockOpenEvent);
            vi.mocked(mockDepositInfoParser.getDepositInfo).mockResolvedValue(mockDepositInfo);

            // Simulate timeout (not expired)
            vi.mocked(mockFillWatcher.waitForFill).mockRejectedValue(
                new FillTimeoutError(mockDepositInfo.depositId, 10000),
            );

            const params: WatchIntentParams = {
                txHash: mockTxHash,
                originChainId: mockOriginChainId,
                destinationChainId: mockDestinationChainId,
                timeout: 10000,
            };

            const updates = [];
            for await (const update of tracker.watchIntent(params)) {
                updates.push(update);
            }

            expect(updates).toHaveLength(4);
            expect(updates[3]?.status).toBe("filling");
            expect(updates[3]?.message).toContain("Stopped watching after timeout");
            expect(updates[3]?.message).toContain("may still be filled before deadline");
        });

        it("should handle waitForFill timeout vs expired distinction", async () => {
            const mockOpenEvent = createMockOpenEvent();
            const mockDepositInfo = createMockDepositInfo({
                destinationChainId: BigInt(mockDestinationChainId),
            });

            vi.mocked(mockOpenWatcher.getOpenEvent).mockResolvedValue(mockOpenEvent);
            vi.mocked(mockDepositInfoParser.getDepositInfo).mockResolvedValue(mockDepositInfo);

            vi.mocked(mockFillWatcher.waitForFill).mockRejectedValue(
                new FillTimeoutError(mockDepositInfo.depositId, 10000),
            );

            const params: WatchIntentParams = {
                txHash: mockTxHash,
                originChainId: mockOriginChainId,
                destinationChainId: mockDestinationChainId,
            };

            const updates = [];
            for await (const update of tracker.watchIntent(params)) {
                updates.push(update);
            }

            const lastUpdate = updates[updates.length - 1];

            expect(lastUpdate?.status).toBe("filling");
            expect(lastUpdate?.message).toContain("timeout");
        });

        it("should propagate non-FillTimeoutError errors", async () => {
            const mockOpenEvent = createMockOpenEvent();
            const mockDepositInfo = createMockDepositInfo({
                destinationChainId: BigInt(mockDestinationChainId),
            });

            vi.mocked(mockOpenWatcher.getOpenEvent).mockResolvedValue(mockOpenEvent);
            vi.mocked(mockDepositInfoParser.getDepositInfo).mockResolvedValue(mockDepositInfo);

            const unexpectedError = new Error("Unexpected RPC error");
            vi.mocked(mockFillWatcher.waitForFill).mockRejectedValue(unexpectedError);

            const params: WatchIntentParams = {
                txHash: mockTxHash,
                originChainId: mockOriginChainId,
                destinationChainId: mockDestinationChainId,
            };

            const generator = tracker.watchIntent(params);

            await expect(async () => {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                for await (const _unusedUpdates of generator) {
                    // Should throw before completing
                }
            }).rejects.toThrow("Unexpected RPC error");
        });

        it("should handle timeout expiring during intent setup", async () => {
            vi.useFakeTimers();

            const mockOpenEvent = createMockOpenEvent();
            const mockDepositInfo = createMockDepositInfo({
                destinationChainId: BigInt(mockDestinationChainId),
            });

            // Mock getOpenEvent taking longer than total timeout
            vi.mocked(mockOpenWatcher.getOpenEvent).mockImplementation(async () => {
                await vi.advanceTimersByTimeAsync(6000);
                return mockOpenEvent;
            });

            vi.mocked(mockDepositInfoParser.getDepositInfo).mockResolvedValue(mockDepositInfo);

            const params: WatchIntentParams = {
                txHash: mockTxHash,
                originChainId: mockOriginChainId,
                destinationChainId: mockDestinationChainId,
                timeout: 5000,
            };

            const generator = tracker.watchIntent(params);

            const updates = [];
            for await (const update of generator) {
                updates.push(update);
            }

            expect(updates).toHaveLength(3);
            expect(updates[0]?.status).toBe("opening");
            expect(updates[1]?.status).toBe("opened");
            expect(updates[2]?.status).toBe("filling");
            expect(updates[2]?.message).toContain("Timeout expired during intent setup");
            expect(updates[2]?.message).toContain("may still be filled before deadline");

            expect(mockFillWatcher.waitForFill).not.toHaveBeenCalled();
        });
    });

    describe("startTracking with event emission", () => {
        it("should emit events during tracking", async () => {
            const mockOpenEvent = createMockOpenEvent();
            const mockDepositInfo = createMockDepositInfo();
            const mockFillEventData = createMockFillEvent();

            vi.mocked(mockOpenWatcher.getOpenEvent).mockResolvedValue(mockOpenEvent);
            vi.mocked(mockDepositInfoParser.getDepositInfo).mockResolvedValue(mockDepositInfo);
            vi.mocked(mockFillWatcher.waitForFill).mockResolvedValue(mockFillEventData);

            const updateEvents: IntentUpdate[] = [];
            const openingEvents: IntentUpdate[] = [];
            const openedEvents: IntentUpdate[] = [];
            const fillingEvents: IntentUpdate[] = [];
            const filledEvents: IntentUpdate[] = [];

            tracker.on("update", (update: IntentUpdate) => updateEvents.push(update));
            tracker.on("opening", (update: IntentUpdate) => openingEvents.push(update));
            tracker.on("opened", (update: IntentUpdate) => openedEvents.push(update));
            tracker.on("filling", (update: IntentUpdate) => fillingEvents.push(update));
            tracker.on("filled", (update: IntentUpdate) => filledEvents.push(update));

            const params: WatchIntentParams = {
                txHash: mockTxHash,
                originChainId: mockOriginChainId,
                destinationChainId: mockDestinationChainId,
                timeout: 5000,
            };

            await tracker.startTracking(params);

            // Should emit 4 update events: opening, opened, filling, filled
            expect(updateEvents).toHaveLength(4);
            expect(openingEvents).toHaveLength(1);
            expect(openedEvents).toHaveLength(1);
            expect(fillingEvents).toHaveLength(1);
            expect(filledEvents).toHaveLength(1);

            expect(updateEvents[0]!.status).toBe("opening");
            expect(updateEvents[1]!.status).toBe("opened");
            expect(updateEvents[2]!.status).toBe("filling");
            expect(updateEvents[3]!.status).toBe("filled");
        });

        it("should return final status info", async () => {
            const mockOpenEvent = createMockOpenEvent();
            const mockDepositInfo = createMockDepositInfo();
            const mockFillEventData = createMockFillEvent();

            vi.mocked(mockOpenWatcher.getOpenEvent).mockResolvedValue(mockOpenEvent);
            vi.mocked(mockDepositInfoParser.getDepositInfo).mockResolvedValue(mockDepositInfo);
            vi.mocked(mockFillWatcher.waitForFill).mockResolvedValue(mockFillEventData);
            vi.mocked(mockFillWatcher.getFill).mockResolvedValue(mockFillEventData);

            const params: WatchIntentParams = {
                txHash: mockTxHash,
                originChainId: mockOriginChainId,
                destinationChainId: mockDestinationChainId,
                timeout: 5000,
            };

            const result = await tracker.startTracking(params);

            expect(result).toHaveProperty("status", "filled");
            expect(result).toHaveProperty("orderId");
            expect(result).toHaveProperty("fillEvent");
        });

        it("should emit error event on failure", async () => {
            const error = new Error("Test error");
            vi.mocked(mockOpenWatcher.getOpenEvent).mockRejectedValue(error);

            const errorEvents: Error[] = [];
            tracker.on("error", (err: Error) => errorEvents.push(err));

            const params: WatchIntentParams = {
                txHash: mockTxHash,
                originChainId: mockOriginChainId,
                destinationChainId: mockDestinationChainId,
                timeout: 5000,
            };

            await expect(tracker.startTracking(params)).rejects.toThrow("Test error");
            expect(errorEvents).toHaveLength(1);
            expect(errorEvents[0]!).toBe(error);
        });

        it("should emit expired event when deadline passed", async () => {
            const expiredDeadline = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
            const mockOpenEvent = createMockOpenEvent({
                resolvedOrder: {
                    ...createMockOpenEvent().resolvedOrder,
                    fillDeadline: expiredDeadline,
                },
            });
            const mockDepositInfo = createMockDepositInfo();

            vi.mocked(mockOpenWatcher.getOpenEvent).mockResolvedValue(mockOpenEvent);
            vi.mocked(mockDepositInfoParser.getDepositInfo).mockResolvedValue(mockDepositInfo);
            vi.mocked(mockFillWatcher.getFill).mockResolvedValue(null);

            const expiredEvents: IntentUpdate[] = [];
            tracker.on("expired", (update: IntentUpdate) => expiredEvents.push(update));

            const params: WatchIntentParams = {
                txHash: mockTxHash,
                originChainId: mockOriginChainId,
                destinationChainId: mockDestinationChainId,
                timeout: 5000,
            };

            await tracker.startTracking(params);

            expect(expiredEvents).toHaveLength(1);
            expect(expiredEvents[0]!.status).toBe("expired");
        });
    });
});
