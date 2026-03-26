/**
 * Order Status Adapter (#111)
 * TEMPORARY - OIF returns status as object instead of string per oif-specs
 * @see https://github.com/openintentsframework/oif-aggregator/issues/111
 */

import { OrderStatus } from "@openintentsframework/oif-specs";

/**
 * Normalize status to OrderStatus enum
 * Handles both oif-specs (string) and OIF solver (object) formats
 */
export function adaptOrderStatus(status: unknown): OrderStatus {
    if (typeof status === "string") {
        return status as OrderStatus;
    }
    if (typeof status === "object" && status !== null) {
        return Object.keys(status)[0] as OrderStatus;
    }
    throw new Error(`Invalid status format: ${status}`);
}
