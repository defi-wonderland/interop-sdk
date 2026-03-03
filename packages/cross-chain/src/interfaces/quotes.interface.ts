import type { Order, Quote } from "@openintentsframework/oif-specs";
import type { Address, PrepareTransactionRequestReturnType } from "viem";

export interface AcrossOrder {
    type: "across";
    payload: {
        simulationSuccess: boolean;
        chainId: number;
        to: Address;
        data: string;
        gas: string;
        maxFeePerGas?: string;
        maxPriorityFeePerGas?: string;
    };
    metadata: object;
}

/**
 * A quote returned by a provider, before the executor enriches it.
 * @internal Used by OifProvider and adapters for intermediate OIF wire-format data.
 * Extends the OIF Quote type to also accept Across orders.
 */
export interface ProviderQuote extends Omit<Quote, "order"> {
    order: Order | AcrossOrder;
    preparedTransaction?: PrepareTransactionRequestReturnType;
}

/**
 * @internal A provider-level executable quote — OIF wire format enriched with SDK routing.
 * For the public SDK type, see {@link import("../types/quote.js").ExecutableQuote}.
 */
export interface ProviderExecutableQuote extends ProviderQuote {
    _providerId: string;
}
