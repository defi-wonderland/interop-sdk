import type { Order, Quote } from "@openintentsframework/oif-specs";
import type { PrepareTransactionRequestReturnType } from "viem";

/**
 * A quote returned by a provider, before the executor enriches it.
 * @internal Used by OifProvider and adapters for intermediate OIF wire-format data.
 */
export interface ProviderQuote extends Omit<Quote, "order"> {
    order: Order;
    preparedTransaction?: PrepareTransactionRequestReturnType;
}

/**
 * @internal A provider-level executable quote — OIF wire format enriched with SDK routing.
 * For the public SDK type, see {@link import("../types/quote.js").ExecutableQuote}.
 */
export interface ProviderExecutableQuote extends ProviderQuote {
    _providerId: string;
}
