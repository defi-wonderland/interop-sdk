import { Hex } from "viem";
import { baseSepolia, sepolia } from "viem/chains";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
    FillWatcher,
    OpenedIntentParser,
    OrderStatusOrExpired,
    OrderTracker,
    OrderTrackingUpdate,
    WatchOrderParams,
} from "../../src/internal.js";
import { FillTimeoutError } from "../../src/services/EventBasedFillWatcher.js";
import { createMockFillEvent, createMockOpenedIntent } from "../mocks/orderTracking.js";

describe("OrderTracker", () => {
    let tracker: OrderTracker;
    let mockOpenedIntentParser: OpenedIntentParser;
    let mockFillWatcher: FillWatcher;

    const mockTxHash = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890" as Hex;
    const mockOriginChainId = sepolia.id;
    const mockDestinationChainId = baseSepolia.id;

    beforeEach(() => {
        vi.clearAllMocks();

        mockOpenedIntentParser = {
            getOpenedIntent: vi.fn(),
        } as unknown as OpenedIntentParser;

        mockFillWatcher = {
            getFill: vi.fn(),
            waitForFill: vi.fn(),
        } as unknown as FillWatcher;

        tracker = new OrderTracker(mockOpenedIntentParser, mockFillWatcher);
    });

    afterEach(() => {
        vi.clearAllTimers();
        vi.useRealTimers();
    });

    describe("getOrderStatus", () => {
        it("should return finalized status when terminal event exists", async () => {
            const mockOpenedIntent = createMockOpenedIntent();
            const mockFillEventData = createMockFillEvent();

            vi.mocked(mockOpenedIntentParser.getOpenedIntent).mockResolvedValue(mockOpenedIntent);
            vi.mocked(mockFillWatcher.getFill).mockResolvedValue(mockFillEventData);

            const result = await tracker.getOrderStatus(mockTxHash, mockOriginChainId);

            expect(result.status).toBe(OrderStatusOrExpired.Finalized);
            expect(result.orderId).toBe(mockOpenedIntent.orderId);
            expect(result.fillEvent).toEqual(mockFillEventData);
            expect(result.depositId).toBe(mockOpenedIntent.depositId);
        });

        it('should return "expired" when past fillDeadline with no fill', async () => {
            const expiredDeadline = Math.floor(Date.now() / 1000) - 3600;
            const mockOpenedIntent = createMockOpenedIntent({
                fillDeadline: expiredDeadline,
            });

            vi.mocked(mockOpenedIntentParser.getOpenedIntent).mockResolvedValue(mockOpenedIntent);
            vi.mocked(mockFillWatcher.getFill).mockResolvedValue(null);

            const result = await tracker.getOrderStatus(mockTxHash, mockOriginChainId);

            expect(result.status).toBe(OrderStatusOrExpired.Expired);
            expect(result.fillEvent).toBeUndefined();
        });

        it("should return pending when before fillDeadline with no terminal event", async () => {
            const futureDeadline = Math.floor(Date.now() / 1000) + 3600;
            const mockOpenedIntent = createMockOpenedIntent({
                fillDeadline: futureDeadline,
            });

            vi.mocked(mockOpenedIntentParser.getOpenedIntent).mockResolvedValue(mockOpenedIntent);
            vi.mocked(mockFillWatcher.getFill).mockResolvedValue(null);

            const result = await tracker.getOrderStatus(mockTxHash, mockOriginChainId);

            expect(result.status).toBe(OrderStatusOrExpired.Pending);
            expect(result.fillEvent).toBeUndefined();
        });

        it("should correctly combine data from parser and fill watcher", async () => {
            const mockOpenedIntent = createMockOpenedIntent({
                orderId:
                    "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as Hex,
                depositId: 99999n,
                destinationChainId: BigInt(mockDestinationChainId),
            });
            const mockFillEventData = createMockFillEvent({
                depositId: 99999n,
            });

            vi.mocked(mockOpenedIntentParser.getOpenedIntent).mockResolvedValue(mockOpenedIntent);
            vi.mocked(mockFillWatcher.getFill).mockResolvedValue(mockFillEventData);

            const result = await tracker.getOrderStatus(mockTxHash, mockOriginChainId);

            expect(result.orderId).toBe(mockOpenedIntent.orderId);
            expect(result.user).toBe(mockOpenedIntent.user);
            expect(result.fillDeadline).toBe(mockOpenedIntent.fillDeadline);
            expect(result.depositId).toBe(mockOpenedIntent.depositId);
            expect(result.destinationChainId).toBe(Number(mockOpenedIntent.destinationChainId));
            expect(result.fillEvent).toEqual(mockFillEventData);
            expect(result.openTxHash).toBe(mockTxHash);
            expect(result.originChainId).toBe(mockOriginChainId);
        });

        it("should handle edge case: exactly at deadline boundary", async () => {
            const currentTime = Math.floor(Date.now() / 1000);
            const mockOpenedIntent = createMockOpenedIntent({
                fillDeadline: currentTime,
            });

            vi.mocked(mockOpenedIntentParser.getOpenedIntent).mockResolvedValue(mockOpenedIntent);
            vi.mocked(mockFillWatcher.getFill).mockResolvedValue(null);

            const result = await tracker.getOrderStatus(mockTxHash, mockOriginChainId);

            expect(result.status).toBe(OrderStatusOrExpired.Pending);
        });
    });

    describe("watchOrder - async generator", () => {
        it("should emit correct sequence: pending → pending → pending → finalized", async () => {
            const mockOpenedIntent = createMockOpenedIntent({
                destinationChainId: BigInt(mockDestinationChainId),
            });
            const mockFillEventData = createMockFillEvent();

            vi.mocked(mockOpenedIntentParser.getOpenedIntent).mockResolvedValue(mockOpenedIntent);
            vi.mocked(mockFillWatcher.waitForFill).mockResolvedValue(mockFillEventData);

            const params: WatchOrderParams = {
                txHash: mockTxHash,
                originChainId: mockOriginChainId,
                destinationChainId: mockDestinationChainId,
                timeout: 10000,
            };

            const updates = [];
            for await (const update of tracker.watchOrder(params)) {
                updates.push(update);
            }

            expect(updates).toHaveLength(4);
            expect(updates[0]?.status).toBe(OrderStatusOrExpired.Pending);
            expect(updates[1]?.status).toBe(OrderStatusOrExpired.Pending);
            expect(updates[2]?.status).toBe(OrderStatusOrExpired.Pending);
            expect(updates[3]?.status).toBe(OrderStatusOrExpired.Finalized);

            expect(updates[3]?.fillTxHash).toBe(mockFillEventData.fillTxHash);
        });

        it("should emit expired if already past deadline before watching (with GRACE_PERIOD)", async () => {
            const expiredDeadline = Math.floor(Date.now() / 1000) - 120;
            const mockOpenedIntent = createMockOpenedIntent({
                fillDeadline: expiredDeadline,
                destinationChainId: BigInt(mockDestinationChainId),
            });

            vi.mocked(mockOpenedIntentParser.getOpenedIntent).mockResolvedValue(mockOpenedIntent);

            const params: WatchOrderParams = {
                txHash: mockTxHash,
                originChainId: mockOriginChainId,
                destinationChainId: mockDestinationChainId,
            };

            const updates = [];
            for await (const update of tracker.watchOrder(params)) {
                updates.push(update);
            }

            expect(updates).toHaveLength(3);
            expect(updates[0]?.status).toBe(OrderStatusOrExpired.Pending);
            expect(updates[1]?.status).toBe(OrderStatusOrExpired.Pending);
            expect(updates[2]?.status).toBe(OrderStatusOrExpired.Expired);
            expect(updates[2]?.message).toContain("expired before watching started");
        });

        it("should NOT emit expired if within GRACE_PERIOD (deadline recently passed)", async () => {
            const recentDeadline = Math.floor(Date.now() / 1000) - 30;
            const mockOpenedIntent = createMockOpenedIntent({
                fillDeadline: recentDeadline,
                destinationChainId: BigInt(mockDestinationChainId),
            });
            const mockFillEventData = createMockFillEvent();

            vi.mocked(mockOpenedIntentParser.getOpenedIntent).mockResolvedValue(mockOpenedIntent);
            vi.mocked(mockFillWatcher.waitForFill).mockResolvedValue(mockFillEventData);

            const params: WatchOrderParams = {
                txHash: mockTxHash,
                originChainId: mockOriginChainId,
                destinationChainId: mockDestinationChainId,
            };

            const updates = [];
            for await (const update of tracker.watchOrder(params)) {
                updates.push(update);
            }

            expect(updates).toHaveLength(4);
            expect(updates[0]?.status).toBe(OrderStatusOrExpired.Pending);
            expect(updates[1]?.status).toBe(OrderStatusOrExpired.Pending);
            expect(updates[2]?.status).toBe(OrderStatusOrExpired.Pending);
            expect(updates[3]?.status).toBe(OrderStatusOrExpired.Finalized);

            expect(mockFillWatcher.waitForFill).toHaveBeenCalled();
        });

        it("should emit expired if deadline passes during fill wait", async () => {
            const expiredDeadline = Math.floor(Date.now() / 1000) - 10;
            const mockOpenedIntent = createMockOpenedIntent({
                fillDeadline: expiredDeadline,
                destinationChainId: BigInt(mockDestinationChainId),
            });

            vi.mocked(mockOpenedIntentParser.getOpenedIntent).mockResolvedValue(mockOpenedIntent);

            vi.mocked(mockFillWatcher.waitForFill).mockRejectedValue(
                new FillTimeoutError(mockOpenedIntent.depositId, 10000),
            );

            const params: WatchOrderParams = {
                txHash: mockTxHash,
                originChainId: mockOriginChainId,
                destinationChainId: mockDestinationChainId,
                timeout: 10000,
            };

            const updates = [];
            for await (const update of tracker.watchOrder(params)) {
                updates.push(update);
            }

            expect(updates).toHaveLength(4);
            expect(updates[3]?.status).toBe(OrderStatusOrExpired.Expired);
            expect(updates[3]?.message).toContain("expired before fill");
        });

        it("should emit pending status on timeout with helpful message", async () => {
            const futureDeadline = Math.floor(Date.now() / 1000) + 3600;
            const mockOpenedIntent = createMockOpenedIntent({
                fillDeadline: futureDeadline,
                destinationChainId: BigInt(mockDestinationChainId),
            });

            vi.mocked(mockOpenedIntentParser.getOpenedIntent).mockResolvedValue(mockOpenedIntent);

            vi.mocked(mockFillWatcher.waitForFill).mockRejectedValue(
                new FillTimeoutError(mockOpenedIntent.depositId, 10000),
            );

            const params: WatchOrderParams = {
                txHash: mockTxHash,
                originChainId: mockOriginChainId,
                destinationChainId: mockDestinationChainId,
                timeout: 10000,
            };

            const updates = [];
            for await (const update of tracker.watchOrder(params)) {
                updates.push(update);
            }

            expect(updates).toHaveLength(4);
            expect(updates[3]?.status).toBe(OrderStatusOrExpired.Pending);
            expect(updates[3]?.message).toContain("Stopped watching after timeout");
            expect(updates[3]?.message).toContain("may still be filled before deadline");
        });

        it("should handle waitForFill timeout vs expired distinction", async () => {
            const mockOpenedIntent = createMockOpenedIntent({
                destinationChainId: BigInt(mockDestinationChainId),
            });

            vi.mocked(mockOpenedIntentParser.getOpenedIntent).mockResolvedValue(mockOpenedIntent);

            vi.mocked(mockFillWatcher.waitForFill).mockRejectedValue(
                new FillTimeoutError(mockOpenedIntent.depositId, 10000),
            );

            const params: WatchOrderParams = {
                txHash: mockTxHash,
                originChainId: mockOriginChainId,
                destinationChainId: mockDestinationChainId,
            };

            const updates = [];
            for await (const update of tracker.watchOrder(params)) {
                updates.push(update);
            }

            const lastUpdate = updates[updates.length - 1];

            expect(lastUpdate?.status).toBe(OrderStatusOrExpired.Pending);
            expect(lastUpdate?.message).toContain("timeout");
        });

        it("should propagate non-FillTimeoutError errors", async () => {
            const mockOpenedIntent = createMockOpenedIntent({
                destinationChainId: BigInt(mockDestinationChainId),
            });

            vi.mocked(mockOpenedIntentParser.getOpenedIntent).mockResolvedValue(mockOpenedIntent);

            const unexpectedError = new Error("Unexpected RPC error");
            vi.mocked(mockFillWatcher.waitForFill).mockRejectedValue(unexpectedError);

            const params: WatchOrderParams = {
                txHash: mockTxHash,
                originChainId: mockOriginChainId,
                destinationChainId: mockDestinationChainId,
            };

            const generator = tracker.watchOrder(params);

            await expect(async () => {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                for await (const _unusedUpdates of generator) {
                    // Should throw before completing
                }
            }).rejects.toThrow("Unexpected RPC error");
        });

        it("should handle timeout expiring during order setup", async () => {
            vi.useFakeTimers();

            const mockOpenedIntent = createMockOpenedIntent({
                destinationChainId: BigInt(mockDestinationChainId),
            });

            vi.mocked(mockOpenedIntentParser.getOpenedIntent).mockImplementation(async () => {
                await vi.advanceTimersByTimeAsync(6000);
                return mockOpenedIntent;
            });

            const params: WatchOrderParams = {
                txHash: mockTxHash,
                originChainId: mockOriginChainId,
                destinationChainId: mockDestinationChainId,
                timeout: 5000,
            };

            const generator = tracker.watchOrder(params);

            const updates = [];
            for await (const update of generator) {
                updates.push(update);
            }

            expect(updates).toHaveLength(3);
            expect(updates[0]?.status).toBe(OrderStatusOrExpired.Pending);
            expect(updates[1]?.status).toBe(OrderStatusOrExpired.Pending);
            expect(updates[2]?.status).toBe(OrderStatusOrExpired.Pending);
            expect(updates[2]?.message).toContain("Timeout expired during order setup");
            expect(updates[2]?.message).toContain("may still be filled before deadline");

            expect(mockFillWatcher.waitForFill).not.toHaveBeenCalled();
        });
    });

    describe("startTracking with event emission", () => {
        it("should emit specific status events during tracking", async () => {
            const mockOpenedIntent = createMockOpenedIntent();
            const mockFillEventData = createMockFillEvent();

            vi.mocked(mockOpenedIntentParser.getOpenedIntent).mockResolvedValue(mockOpenedIntent);
            vi.mocked(mockFillWatcher.waitForFill).mockResolvedValue(mockFillEventData);

            const pendingEvents: OrderTrackingUpdate[] = [];
            const finalizedEvents: OrderTrackingUpdate[] = [];

            tracker.on("pending", (update: OrderTrackingUpdate) => pendingEvents.push(update));
            tracker.on("finalized", (update: OrderTrackingUpdate) => finalizedEvents.push(update));

            const params: WatchOrderParams = {
                txHash: mockTxHash,
                originChainId: mockOriginChainId,
                destinationChainId: mockDestinationChainId,
                timeout: 5000,
            };

            await tracker.startTracking(params);

            expect(pendingEvents).toHaveLength(3);
            expect(finalizedEvents).toHaveLength(1);

            expect(pendingEvents[0]!.status).toBe(OrderStatusOrExpired.Pending);
            expect(pendingEvents[1]!.status).toBe(OrderStatusOrExpired.Pending);
            expect(pendingEvents[2]!.status).toBe(OrderStatusOrExpired.Pending);
            expect(finalizedEvents[0]!.status).toBe(OrderStatusOrExpired.Finalized);
        });

        it("should return final status info", async () => {
            const mockOpenedIntent = createMockOpenedIntent();
            const mockFillEventData = createMockFillEvent();

            vi.mocked(mockOpenedIntentParser.getOpenedIntent).mockResolvedValue(mockOpenedIntent);
            vi.mocked(mockFillWatcher.waitForFill).mockResolvedValue(mockFillEventData);
            vi.mocked(mockFillWatcher.getFill).mockResolvedValue(mockFillEventData);

            const params: WatchOrderParams = {
                txHash: mockTxHash,
                originChainId: mockOriginChainId,
                destinationChainId: mockDestinationChainId,
                timeout: 5000,
            };

            const result = await tracker.startTracking(params);

            expect(result).toHaveProperty("status", OrderStatusOrExpired.Finalized);
            expect(result).toHaveProperty("orderId");
            expect(result).toHaveProperty("fillEvent");
        });

        it("should emit error event on failure", async () => {
            const error = new Error("Test error");
            vi.mocked(mockOpenedIntentParser.getOpenedIntent).mockRejectedValue(error);

            const errorEvents: Error[] = [];
            tracker.on("error", (err: Error) => errorEvents.push(err));

            const params: WatchOrderParams = {
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
            const expiredDeadline = Math.floor(Date.now() / 1000) - 3600;
            const mockOpenedIntent = createMockOpenedIntent({
                fillDeadline: expiredDeadline,
            });

            vi.mocked(mockOpenedIntentParser.getOpenedIntent).mockResolvedValue(mockOpenedIntent);
            vi.mocked(mockFillWatcher.getFill).mockResolvedValue(null);

            const expiredEvents: OrderTrackingUpdate[] = [];
            tracker.on("expired", (update: OrderTrackingUpdate) => expiredEvents.push(update));

            const params: WatchOrderParams = {
                txHash: mockTxHash,
                originChainId: mockOriginChainId,
                destinationChainId: mockDestinationChainId,
                timeout: 5000,
            };

            await tracker.startTracking(params);

            expect(expiredEvents).toHaveLength(1);
            expect(expiredEvents[0]!.status).toBe(OrderStatusOrExpired.Expired);
        });
    });
});
