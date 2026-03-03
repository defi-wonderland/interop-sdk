import type { Address, GetQuoteRequest } from "@openintentsframework/oif-specs";

import type { IntentValidator, ProviderExecutableQuote } from "../internal.js";

export class SettlerIntentValidator implements IntentValidator {
    constructor(private readonly validSettlers: readonly Address[]) {}

    async validateIntent(
        _userIntent: GetQuoteRequest,
        quote: ProviderExecutableQuote,
    ): Promise<boolean> {
        return this.validSettlers.includes(quote.preparedTransaction?.to ?? "");
    }
}
