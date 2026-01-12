import type { GetQuoteRequest } from "@openintentsframework/oif-specs";
import type { Hex } from "viem";

import type { ExecutableQuote, IntentValidator } from "../internal.js";
import { OIF_ORDER_TYPES } from "../types/oif.js";
import { validateAcrossPayload } from "./acrossPayloadValidator.js";
import { validateOifPayload } from "./oifPayloadValidator.js";

/** Validates that calldata from external APIs matches the user's intent before signing */
export class PayloadIntentValidator implements IntentValidator {
    async validateIntent(userIntent: GetQuoteRequest, quote: ExecutableQuote): Promise<boolean> {
        const order = quote.order;

        if (order.type === "across") {
            return validateAcrossPayload(userIntent, order.payload.data as Hex);
        }

        if (OIF_ORDER_TYPES.includes(order.type)) {
            return validateOifPayload(userIntent, order);
        }

        return false;
    }
}
