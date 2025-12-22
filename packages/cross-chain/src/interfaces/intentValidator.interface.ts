import type { GetQuoteRequest } from "@openintentsframework/oif-specs";

import { ExecutableQuote } from "../internal.js";

export interface IntentValidator {
    validateIntent(userIntent: GetQuoteRequest, quote: ExecutableQuote): Promise<boolean>;
}
