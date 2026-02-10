import type { Order } from "@openintentsframework/oif-specs";

import type { AcrossOrder } from "../interfaces/quotes.interface.js";

/**
 * Type guard for orders that require EIP-712 typed data signing.
 */
export function isSignableOifOrder(order: Order | AcrossOrder): order is Order {
    return (
        order.type === "oif-escrow-v0" ||
        order.type === "oif-3009-v0" ||
        order.type === "oif-resource-lock-v0"
    );
}
