import { GetQuoteRequest } from "@openintentsframework/oif-specs";

import { ExecutableQuote, IntentValidator } from "../internal.js";

export class IntentValidationsAggregator implements IntentValidator {
    constructor(private readonly validators: IntentValidator[]) {}

    async validateIntent(userIntent: GetQuoteRequest, quote: ExecutableQuote): Promise<boolean> {
        const results = await Promise.all(
            this.validators.map((validator) => validator.validateIntent(userIntent, quote)),
        );
        return results.every((result) => result);
    }
}
