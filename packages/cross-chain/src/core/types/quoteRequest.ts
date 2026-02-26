import type { InteropAccountId } from "./interopAccountId.js";

/** A single input in a swap intent. */
export interface IntentInput {
    /** Token to provide (includes chain) */
    asset: InteropAccountId;
    /** Amount in smallest unit (decimal string). Optional for exact-output swaps. */
    amount?: string;
}

/** A single output in a swap intent. */
export interface IntentOutput {
    /** Token to receive (includes chain) */
    asset: InteropAccountId;
    /** Amount in smallest unit (decimal string). Optional for exact-input swaps. */
    amount?: string;
    /** Recipient — defaults to user on the output chain if omitted */
    recipient?: InteropAccountId;
    /** Encoded function call for composability on delivery */
    calldata?: string;
}

/** The swap intent describing what goes in and what comes out. */
export interface Intent {
    inputs: IntentInput[];
    outputs: IntentOutput[];
    swapType?: "exact-input" | "exact-output";
}

/**
 * SDK-friendly quote request.
 *
 * Replaces oif-specs `GetQuoteRequest` with readable addresses and
 * cleaner field names.
 */
export interface QuoteRequest {
    /** The user requesting the quote */
    user: InteropAccountId;
    /** What the user wants to swap */
    intent: Intent;
    /** Lock mechanisms the user's wallet supports (e.g. "oif-escrow", "compact-resource-lock") */
    supportedLocks?: string[];
}
