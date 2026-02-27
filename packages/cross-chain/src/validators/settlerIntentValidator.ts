import type { Address, GetQuoteRequest } from "@openintentsframework/oif-specs";

import type { IntentValidator, ProviderExecutableQuote } from "../internal.js";

export class SettlerIntentValidator implements IntentValidator {
    constructor(private readonly validSettlers: readonly Address[]) {}

    async validateIntent(
        _userIntent: GetQuoteRequest,
        quote: ProviderExecutableQuote,
    ): Promise<boolean> {
        // For user-open orders, check the openIntentTx.to address
        const order = quote.order as {
            type: string;
            openIntentTx?: { to: string };
        };
        if (order.type === "oif-user-open-v0" && order.openIntentTx?.to) {
            return this.validSettlers.some(
                (settler) => settler.toLowerCase() === order.openIntentTx!.to.toLowerCase(),
            );
        }
        return false;
    }
}
