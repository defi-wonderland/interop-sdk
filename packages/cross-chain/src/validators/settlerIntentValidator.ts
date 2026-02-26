import type { Address, GetQuoteRequest } from "@openintentsframework/oif-specs";

import type { IntentValidator, ProviderExecutableQuote } from "../internal.js";

export class SettlerIntentValidator implements IntentValidator {
    constructor(private readonly validSettlers: readonly Address[]) {}

    async validateIntent(
        _userIntent: GetQuoteRequest,
        quote: ProviderExecutableQuote,
    ): Promise<boolean> {
        // Check preparedTransaction (legacy OIF wire-format path)
        if (quote.preparedTransaction?.to) {
            return this.validSettlers.includes(quote.preparedTransaction.to);
        }

        // Check step-based order (SDK Quote path — e.g. Across)
        const step =
            quote.order && "steps" in quote.order
                ? (quote.order as { steps: Array<{ kind: string; transaction?: { to?: string } }> })
                      .steps[0]
                : undefined;

        if (step?.kind === "transaction" && step.transaction?.to) {
            return this.validSettlers.includes(step.transaction.to as Address);
        }

        return false;
    }
}
