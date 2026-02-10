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
        maxFeePerGas: string;
        maxPriorityFeePerGas: string;
    };
    metadata: object;
}

/**
 * A quote returned by a provider, before the executor enriches it.
 * Extends the OIF Quote type to also accept Across orders.
 */
export interface ProviderQuote extends Omit<Quote, "order"> {
    order: Order | AcrossOrder;
    preparedTransaction?: PrepareTransactionRequestReturnType;
}

/**
 * A quote ready for execution — enriched by ProviderExecutor.getQuotes()
 * with the SDK executor identifier for internal routing.
 */
export interface ExecutableQuote extends ProviderQuote {
    /**
     * @internal Identifies which SDK executor handles this quote (submit, tracking).
     * Kept separate from `provider` (the solver's original value, part of HMAC)
     * so the quote can be sent back to the solver unmodified.
     */
    _providerId: string;
}
