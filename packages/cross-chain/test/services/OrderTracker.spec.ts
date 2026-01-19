import { Hex } from "viem";
import { baseSepolia, sepolia } from "viem/chains";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
    FillWatcher,
    OpenedIntentParser,
    OrderFailureReason,
    OrderStatus,
    OrderTracker,
    OrderTrackerTimeoutPayload,
    OrderTrackerYield,
    OrderTrackerYieldType,
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

            expect(result.status).toBe(OrderStatus.Finalized);
            expect(result.orderId).toBe(mockOpenedIntent.orderId);
            expect(result.fillEvent).toEqual(mockFillEventData);
            expect(result.depositId).toBe(mockOpenedIntent.depositId);
        });

        it("should return Failed with deadline_exceeded when past fillDeadline with no fill", async () => {
            const expiredDeadline = Math.floor(Date.now() / 1000) - 3600;
            const mockOpenedIntent = createMockOpenedIntent({
                fillDeadline: expiredDeadline,
            });

            vi.mocked(mockOpenedIntentParser.getOpenedIntent).mockResolvedValue(mockOpenedIntent);
            vi.mocked(mockFillWatcher.getFill).mockResolvedValue(null);

            const result = await tracker.getOrderStatus(mockTxHash, mockOriginChainId);

            expect(result.status).toBe(OrderStatus.Failed);
            expect(result.failureReason).toBe(OrderFailureReason.DeadlineExceeded);
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

            expect(result.status).toBe(OrderStatus.Pending);
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

            expect(result.status).toBe(OrderStatus.Pending);
        });
    });

    describe("watchOrder - async generator (Option B discriminated union)", () => {
        function collectUpdates(items: OrderTrackerYield[]): OrderTrackingUpdate[] {
            return items
                .filter(
                    (
                        item,
                    ): item is {
                        type: typeof OrderTrackerYieldType.Update;
                        update: OrderTrackingUpdate;
                    } => item.type === OrderTrackerYieldType.Update,
                )
                .map((item) => item.update);
        }

        function getTimeoutPayload(
            items: OrderTrackerYield[],
        ): OrderTrackerTimeoutPayload | undefined {
            const timeout = items.find(
                (
                    item,
                ): item is {
                    type: typeof OrderTrackerYieldType.Timeout;
                    payload: OrderTrackerTimeoutPayload;
                } => item.type === OrderTrackerYieldType.Timeout,
            );
            return timeout?.payload;
        }

        it("should yield correct sequence: pending → pending → pending → finalized (all as updates)", async () => {
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

            const items: OrderTrackerYield[] = [];
            for await (const item of tracker.watchOrder(params)) {
                items.push(item);
            }

            expect(items).toHaveLength(4);
            expect(items.every((i) => i.type === OrderTrackerYieldType.Update)).toBe(true);

            const updates = collectUpdates(items);
            expect(updates[0]?.status).toBe(OrderStatus.Pending);
            expect(updates[1]?.status).toBe(OrderStatus.Pending);
            expect(updates[2]?.status).toBe(OrderStatus.Pending);
            expect(updates[3]?.status).toBe(OrderStatus.Finalized);
            expect(updates[3]?.fillTxHash).toBe(mockFillEventData.fillTxHash);
        });

        it("should yield Failed with deadline_exceeded if already past deadline before watching (with GRACE_PERIOD)", async () => {
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

            const items: OrderTrackerYield[] = [];
            for await (const item of tracker.watchOrder(params)) {
                items.push(item);
            }

            expect(items).toHaveLength(3);
            const updates = collectUpdates(items);
            expect(updates[0]?.status).toBe(OrderStatus.Pending);
            expect(updates[1]?.status).toBe(OrderStatus.Pending);
            expect(updates[2]?.status).toBe(OrderStatus.Failed);
            expect(updates[2]?.failureReason).toBe(OrderFailureReason.DeadlineExceeded);
            expect(updates[2]?.message).toContain("Deadline exceeded before watching started");
        });

        it("should NOT yield Failed if within GRACE_PERIOD (deadline recently passed)", async () => {
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

            const items: OrderTrackerYield[] = [];
            for await (const item of tracker.watchOrder(params)) {
                items.push(item);
            }

            expect(items).toHaveLength(4);
            const updates = collectUpdates(items);
            expect(updates[0]?.status).toBe(OrderStatus.Pending);
            expect(updates[1]?.status).toBe(OrderStatus.Pending);
            expect(updates[2]?.status).toBe(OrderStatus.Pending);
            expect(updates[3]?.status).toBe(OrderStatus.Finalized);

            expect(mockFillWatcher.waitForFill).toHaveBeenCalled();
        });

        it("should yield Failed with deadline_exceeded if deadline passes during fill wait", async () => {
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

            const items: OrderTrackerYield[] = [];
            for await (const item of tracker.watchOrder(params)) {
                items.push(item);
            }

            expect(items).toHaveLength(4);
            const updates = collectUpdates(items);
            expect(updates[3]?.status).toBe(OrderStatus.Failed);
            expect(updates[3]?.failureReason).toBe(OrderFailureReason.DeadlineExceeded);
            expect(updates[3]?.message).toContain("Deadline exceeded before fill");
        });

        it("should yield timeout payload when fill watcher times out but deadline not exceeded", async () => {
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

            const items: OrderTrackerYield[] = [];
            for await (const item of tracker.watchOrder(params)) {
                items.push(item);
            }

            expect(items).toHaveLength(4);
            const updates = collectUpdates(items);
            expect(updates).toHaveLength(3);

            const timeoutPayload = getTimeoutPayload(items);
            expect(timeoutPayload).toBeDefined();
            expect(timeoutPayload?.message).toContain("Stopped watching after timeout");
            expect(timeoutPayload?.message).toContain("may still finalize before deadline");
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
                for await (const _unusedItems of generator) {
                    // Should throw before completing
                }
            }).rejects.toThrow("Unexpected RPC error");
        });

        it("should yield timeout payload when timeout expires during order setup", async () => {
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

            const items: OrderTrackerYield[] = [];
            for await (const item of generator) {
                items.push(item);
            }

            expect(items).toHaveLength(3);
            const updates = collectUpdates(items);
            expect(updates).toHaveLength(2);
            expect(updates[0]?.status).toBe(OrderStatus.Pending);
            expect(updates[1]?.status).toBe(OrderStatus.Pending);

            const timeoutPayload = getTimeoutPayload(items);
            expect(timeoutPayload).toBeDefined();
            expect(timeoutPayload?.message).toContain("Timeout expired during order setup");
            expect(timeoutPayload?.message).toContain("may still finalize before deadline");

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

            tracker.on(OrderStatus.Pending, (update) => pendingEvents.push(update));
            tracker.on(OrderStatus.Finalized, (update) => finalizedEvents.push(update));

            const params: WatchOrderParams = {
                txHash: mockTxHash,
                originChainId: mockOriginChainId,
                destinationChainId: mockDestinationChainId,
                timeout: 5000,
            };

            await tracker.startTracking(params);

            expect(pendingEvents).toHaveLength(3);
            expect(finalizedEvents).toHaveLength(1);

            expect(pendingEvents[0]!.status).toBe(OrderStatus.Pending);
            expect(pendingEvents[1]!.status).toBe(OrderStatus.Pending);
            expect(pendingEvents[2]!.status).toBe(OrderStatus.Pending);
            expect(finalizedEvents[0]!.status).toBe(OrderStatus.Finalized);
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

            expect(result).toHaveProperty("status", OrderStatus.Finalized);
            expect(result).toHaveProperty("orderId");
            expect(result).toHaveProperty("fillEvent");
        });

        it("should emit error event on failure", async () => {
            const error = new Error("Test error");
            vi.mocked(mockOpenedIntentParser.getOpenedIntent).mockRejectedValue(error);

            const errorEvents: Error[] = [];
            tracker.on("error", (err) => errorEvents.push(err));

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

        it("should emit Failed event with deadline_exceeded when deadline passed", async () => {
            const expiredDeadline = Math.floor(Date.now() / 1000) - 3600;
            const mockOpenedIntent = createMockOpenedIntent({
                fillDeadline: expiredDeadline,
            });

            vi.mocked(mockOpenedIntentParser.getOpenedIntent).mockResolvedValue(mockOpenedIntent);
            vi.mocked(mockFillWatcher.getFill).mockResolvedValue(null);

            const failedEvents: OrderTrackingUpdate[] = [];
            tracker.on(OrderStatus.Failed, (update) => failedEvents.push(update));

            const params: WatchOrderParams = {
                txHash: mockTxHash,
                originChainId: mockOriginChainId,
                destinationChainId: mockDestinationChainId,
                timeout: 5000,
            };

            await tracker.startTracking(params);

            expect(failedEvents).toHaveLength(1);
            expect(failedEvents[0]!.status).toBe(OrderStatus.Failed);
            expect(failedEvents[0]!.failureReason).toBe(OrderFailureReason.DeadlineExceeded);
        });

        it("should emit timeout event when tracking times out but deadline not exceeded", async () => {
            const futureDeadline = Math.floor(Date.now() / 1000) + 3600;
            const mockOpenedIntent = createMockOpenedIntent({
                fillDeadline: futureDeadline,
            });

            vi.mocked(mockOpenedIntentParser.getOpenedIntent).mockResolvedValue(mockOpenedIntent);
            vi.mocked(mockFillWatcher.waitForFill).mockRejectedValue(
                new FillTimeoutError(mockOpenedIntent.depositId, 10000),
            );
            vi.mocked(mockFillWatcher.getFill).mockResolvedValue(null);

            const timeoutEvents: OrderTrackerTimeoutPayload[] = [];
            tracker.on("timeout", (payload) => timeoutEvents.push(payload));

            const params: WatchOrderParams = {
                txHash: mockTxHash,
                originChainId: mockOriginChainId,
                destinationChainId: mockDestinationChainId,
                timeout: 5000,
            };

            await tracker.startTracking(params);

            expect(timeoutEvents).toHaveLength(1);
            expect(timeoutEvents[0]!.message).toContain("Stopped watching after timeout");
        });
    });
});
