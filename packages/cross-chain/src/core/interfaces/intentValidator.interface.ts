import type { GetQuoteRequest } from "@openintentsframework/oif-specs";

import type { ProviderExecutableQuote } from "../../internal.js";

export interface IntentValidator {
    validateIntent(userIntent: GetQuoteRequest, quote: ProviderExecutableQuote): Promise<boolean>;
}
