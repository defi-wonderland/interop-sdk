import type { GetQuoteRequest } from "@openintentsframework/oif-specs";

import type { ExecutableQuote, IntentValidator } from "../internal.js";
import type { Address } from "../types/oif.js";

export class SettlerIntentValidator implements IntentValidator {
    constructor(private readonly validSettlers: readonly Address[]) {}

    async validateIntent(_userIntent: GetQuoteRequest, quote: ExecutableQuote): Promise<boolean> {
        return this.validSettlers.includes(quote.preparedTransaction?.to ?? "");
    }
}
