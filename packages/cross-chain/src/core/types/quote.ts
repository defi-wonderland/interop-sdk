import type { Hex } from "viem";

import type { InteropAccountId } from "./interopAccountId.js";
import type { Order } from "./order.js";

// ── Quote Preview ────────────────────────────────────────

export interface QuotePreviewInput {
    /** Who is paying */
    account: InteropAccountId;
    /** What token, on what chain */
    asset: InteropAccountId;
    /** Amount in smallest unit (decimal string) */
    amount: string;
}

export interface QuotePreviewOutput {
    /** Who receives */
    account: InteropAccountId;
    /** What token, on what chain */
    asset: InteropAccountId;
    /** Amount in smallest unit (decimal string) */
    amount: string;
}

export interface QuotePreview {
    inputs: QuotePreviewInput[];
    outputs: QuotePreviewOutput[];
}

// ── Quote ────────────────────────────────────────────────

/**
 * A cross-chain swap quote with a step-based order and readable addresses.
 */
export interface Quote {
    /** What the user needs to do (sign, send tx, etc.) */
    order: Order;
    /** What goes in and what comes out */
    preview: QuotePreview;
    /** Quote validity (unix timestamp in seconds) */
    validUntil?: number;
    /** Estimated time to completion (seconds) */
    eta?: number;
    /** Provider/solver identifier */
    provider: string;
    /** Quote identifier for submission */
    quoteId?: string;
    /** How failures are handled */
    failureHandling?: string;
    /** Whether the order can be partially filled */
    partialFill?: boolean;
    /** Opaque provider metadata */
    metadata?: Record<string, unknown>;
}

/**
 * A quote enriched with internal SDK routing fields.
 * Extends {@link Quote} with data needed for submission.
 */
export interface ExecutableQuote extends Quote {
    /** @internal Identifies which SDK provider handles this quote */
    _providerId: string;
}

// ── Submit Order Response ────────────────────────────────

/** Response from submitting an order to a provider. */
export interface SubmitOrderResponse {
    /** The order identifier from the solver */
    orderId: Hex;
    /** Status string from the solver */
    status?: string;
    /** Optional message from the solver */
    message?: string;
}

// ── Step Results ─────────────────────────────────────────

/** Result of executing a signature step. Used with {@link ProviderExecutor.submitOrder}. */
export interface StepResult {
    /** Index into order.steps[] */
    stepIndex: number;
    /** EIP-712 signature */
    signature: Hex;
}

// ── Executor Response ────────────────────────────────────

export interface GetQuotesError {
    error: Error;
    errorMsg: string;
}

export interface GetQuotesResponse {
    quotes: ExecutableQuote[];
    errors: GetQuotesError[];
}
