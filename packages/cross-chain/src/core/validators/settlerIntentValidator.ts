import type { Address, GetQuoteRequest } from "@openintentsframework/oif-specs";

import type { IntentValidator } from "../interfaces/intentValidator.interface.js";
import type { ProviderExecutableQuote } from "../interfaces/quotes.interface.js";
import type { Order } from "../schemas/order.js";

export class SettlerIntentValidator implements IntentValidator {
    constructor(private readonly validSettlers: readonly Address[]) {}

    async validateIntent(
        _userIntent: GetQuoteRequest,
        quote: ProviderExecutableQuote,
    ): Promise<boolean> {
        // Check step-based order (SDK Quote path — e.g. Across)
        if (!quote.order || !("steps" in quote.order)) {
            return false;
        }

        const order = quote.order as Order;

        // Validate ALL transaction steps against validSettlers
        for (const step of order.steps) {
            if (step.kind === "transaction") {
                if (!step.transaction?.to) {
                    return false;
                }
                if (
                    !this.validSettlers.some(
                        (settler) => settler.toLowerCase() === step.transaction!.to!.toLowerCase(),
                    )
                ) {
                    return false;
                }
            }
        }

        // At least one transaction step with a valid target must exist
        return order.steps.some((s) => s.kind === "transaction" && !!s.transaction?.to);
    }
}
