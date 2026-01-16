import type { OrderStatus } from "../types/oif.js";
import type { OrderTrackerTimeoutPayload, OrderTrackingUpdate } from "../types/orderTracking.js";

/**
 * Event names for non-status events emitted by OrderTracker.
 */
export const OrderTrackerEvent = {
    Timeout: "timeout",
    Error: "error",
} as const;

export type OrderTrackerEvent = (typeof OrderTrackerEvent)[keyof typeof OrderTrackerEvent];

/**
 * Event map for OrderTracker events.
 * - OrderStatus events: emitted for each status update
 * - timeout: emitted when tracking stops due to SDK timeout (order may still finalize)
 * - error: emitted when an unexpected error occurs
 * @see https://docs.openintents.xyz/docs/apis/order-api#order-statuses
 */
export type OrderTrackerEvents = {
    [K in OrderStatus]: (update: OrderTrackingUpdate) => void;
} & {
    [OrderTrackerEvent.Timeout]: (payload: OrderTrackerTimeoutPayload) => void;
    [OrderTrackerEvent.Error]: (error: Error) => void;
};
