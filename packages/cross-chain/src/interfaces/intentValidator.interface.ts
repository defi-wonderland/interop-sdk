import type { GetQuoteRequest } from "@openintentsframework/oif-specs";

import type { ProviderExecutableQuote } from "./quotes.interface.js";

export interface IntentValidator {
    validateIntent(userIntent: GetQuoteRequest, quote: ProviderExecutableQuote): Promise<boolean>;
}
