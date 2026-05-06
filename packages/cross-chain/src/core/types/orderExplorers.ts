import type { Hex } from "viem";

/**
 * Explorer URLs for an order. Consumers should prefer `tracker` when present
 * and fall back to `origin` / `destination` otherwise.
 */
export interface OrderExplorers {
    /** Bridge-level scanner covering both legs (when the provider has one). */
    tracker?: string;
    /** Origin chain explorer URL for the open tx. */
    origin?: string;
    /** Destination chain explorer URL for the fill tx. Set once the fill is observed. */
    destination?: string;
}

export interface GetOrderExplorersParams {
    originChainId: number;
    originTxHash?: Hex;
    destinationChainId?: number;
    /** Becomes available once the fill event is observed. */
    destinationTxHash?: Hex;
}
