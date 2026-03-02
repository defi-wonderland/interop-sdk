import type { GetQuoteRequest } from "@openintentsframework/oif-specs";

import type { IntentValidator } from "../interfaces/intentValidator.interface.js";
import type { ProviderExecutableQuote } from "../interfaces/quotes.interface.js";
import { OIF_ORDER_TYPES } from "../../protocols/oif/constants/openIntentFramework.js";
import { validateOifPayload } from "../../protocols/oif/validators/oifPayloadValidator.js";

/**
 * Validates that calldata from external APIs matches the user's intent before signing.
 *
 * Note: Across calldata validation is handled directly inside AcrossProvider.getQuotes()
 * using the same decodeAcrossCalldata utility but comparing against SDK QuoteRequest types.
 */
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
