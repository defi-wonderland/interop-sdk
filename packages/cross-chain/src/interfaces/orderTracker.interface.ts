import type { OrderStatusOrExpired, OrderTrackingUpdate } from "../internal.js";

/**
 * Event map for OrderTracker events (OIF Order API aligned)
 * @see https://docs.openintents.xyz/docs/apis/order-api#order-statuses
 */
export type OrderTrackerEvents = Record<
    OrderStatusOrExpired,
    (update: OrderTrackingUpdate) => void
> & {
    error: (error: Error) => void;
};
