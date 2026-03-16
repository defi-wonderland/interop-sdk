/**
 * Maps LI.FI order server status to SDK {@link OrderStatus}.
 *
 * LI.FI statuses: "Signed" | "" | "Settled" | "Delivered" | "Expired" | "Failed"
 */

import { OrderStatus } from "../../../core/types/orderTracking.js";

export function adaptOrderStatus(lifiStatus: string): OrderStatus {
    switch (lifiStatus) {
        case "Settled":
            return OrderStatus.Finalized;
        case "Delivered":
            return OrderStatus.Executing;
        case "Signed":
            return OrderStatus.Pending;
        case "Expired":
        case "Failed":
            return OrderStatus.Failed;
        default:
            return OrderStatus.Pending;
    }
}
