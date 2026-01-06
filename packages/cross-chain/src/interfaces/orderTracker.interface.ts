import type { OrderApiStatusUpdate } from "../internal.js";

/**
 * Event map for OrderTracker events (OIF Order API aligned)
 * @see https://docs.openintents.xyz/docs/apis/order-api#order-statuses
 */
export interface OrderTrackerEvents {
    pending: (update: OrderApiStatusUpdate) => void;
    filling: (update: OrderApiStatusUpdate) => void;
    filled: (update: OrderApiStatusUpdate) => void;
    claiming: (update: OrderApiStatusUpdate) => void;
    completed: (update: OrderApiStatusUpdate) => void;
    failed: (update: OrderApiStatusUpdate) => void;
    expired: (update: OrderApiStatusUpdate) => void;
    error: (error: Error) => void;
}
