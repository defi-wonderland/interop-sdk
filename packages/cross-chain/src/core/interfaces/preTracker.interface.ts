import type { Hex } from "viem";

import type { APIPreTrackerConfig } from "../services/APIPreTracker.js";

/**
 * Parameters passed to a pre-tracker before order watching begins.
 */
export interface PreTrackerParams {
    /** Origin transaction hash */
    txHash: Hex;
    /** Chain ID where the origin transaction was submitted */
    originChainId: number;
    /** Optional order or request identifier, when already known */
    orderId?: Hex;
}

/**
 * Executes a protocol-specific step before order tracking begins.
 *
 * Implementations are best-effort: callers catch and log errors
 * without blocking the tracking flow.
 */
export interface PreTracker {
    /** Run the pre-tracking step with the given parameters. */
    execute(params: PreTrackerParams): Promise<void>;
}

/**
 * Discriminated union of pre-tracker configurations.
 * Returned by {@link CrossChainProvider.getTrackingConfig} to declare which
 * pre-tracking strategy a provider requires.
 */
export type PreTrackerConfig = APIPreTrackerConfig;

// Re-export for convenience
export type { APIPreTrackerConfig };
