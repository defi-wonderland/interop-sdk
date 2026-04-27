import type { GetQuoteRequest, Order } from "@openintentsframework/oif-specs";

import { validate3009Order } from "./oif3009Validator.js";
import { validateEscrowOrder } from "./oifEscrowValidator.js";
import { validateUserOpenOrder } from "./oifUserOpenValidator.js";

export async function validateOifPayload(
    userIntent: GetQuoteRequest,
    order: Order,
): Promise<boolean> {
    switch (order.type) {
        case "oif-escrow-v0":
            return validateEscrowOrder(userIntent, order);
        case "oif-3009-v0":
            return validate3009Order(userIntent, order);
        case "oif-user-open-v0":
            return validateUserOpenOrder(userIntent, order);
        case "oif-resource-lock-v0":
            // TODO (EFI-887): re-enable when resource-lock support lands.
            throw new Error("oif-resource-lock-v0 is not supported in this release");
        default:
            return false;
    }
}
