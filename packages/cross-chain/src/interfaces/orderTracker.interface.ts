import type { OrderStatus } from "../types/oif.js";
import type { OrderTrackerTimeoutPayload, OrderTrackingUpdate } from "../types/orderTracking.js";

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
    timeout: (payload: OrderTrackerTimeoutPayload) => void;
    error: (error: Error) => void;
};
