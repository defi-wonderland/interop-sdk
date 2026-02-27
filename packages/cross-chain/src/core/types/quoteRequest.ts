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
    /** Recipient address — defaults to user. Chain implied by output.asset.chainId */
    recipient?: string;
    /** Encoded function call for composability on delivery */
    calldata?: string;
}

/**
 * SDK-friendly quote request.
 *
 * Flat structure with singular input/output for the common single-asset swap case.
 * Use `InteropAccountId` for assets (chain + address) and a plain address string for the user.
 */
export interface QuoteRequest {
    /** User's EVM address (chain derived from input/output assets) */
    user: string;
    /** What the user sends */
    input: IntentInput;
    /** What the user receives */
    output: IntentOutput;
    /** Swap direction (default: "exact-input") */
    swapType?: "exact-input" | "exact-output";
}
