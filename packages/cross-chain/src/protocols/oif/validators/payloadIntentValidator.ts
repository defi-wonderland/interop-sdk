import type { GetQuoteRequest } from "@openintentsframework/oif-specs";

import type { IntentValidator, ProviderExecutableQuote } from "../../../internal.js";
import { OIF_ORDER_TYPES } from "../constants.js";
import { validateOifPayload } from "./oifPayloadValidator.js";

/** Validates that calldata from external APIs matches the user's intent before signing */
export class PayloadIntentValidator implements IntentValidator {
    async validateIntent(
        userIntent: GetQuoteRequest,
        quote: ProviderExecutableQuote,
    ): Promise<boolean> {
        const order = quote.order;

        if (OIF_ORDER_TYPES.includes(order.type)) {
            return validateOifPayload(userIntent, order);
        }

        return false;
    }
}
