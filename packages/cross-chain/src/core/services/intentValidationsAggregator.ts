import { GetQuoteRequest } from "@openintentsframework/oif-specs";

import type { IntentValidator } from "../interfaces/intentValidator.interface.js";
import type { ProviderExecutableQuote } from "../interfaces/quotes.interface.js";

export class IntentValidationsAggregator implements IntentValidator {
    constructor(private readonly validators: IntentValidator[]) {}

    async validateIntent(
        userIntent: GetQuoteRequest,
        quote: ProviderExecutableQuote,
    ): Promise<boolean> {
        const results = await Promise.all(
            this.validators.map((validator) => validator.validateIntent(userIntent, quote)),
        );
        return results.every((result) => result);
    }
}
