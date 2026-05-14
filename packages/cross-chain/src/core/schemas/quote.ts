import type { Hex } from "viem";
import { z } from "zod";

import { addressString, amountSchema, amountUsdSchema, chainIdSchema } from "./common.js";
import { OrderSchema } from "./order.js";

export const QuotePreviewEntrySchema = z.object({
    chainId: chainIdSchema,
    accountAddress: addressString,
    assetAddress: addressString,
    amount: amountSchema,
    amountUsd: amountUsdSchema,
});

export const QuotePreviewSchema = z.object({
    inputs: z.array(QuotePreviewEntrySchema).min(1),
    outputs: z.array(QuotePreviewEntrySchema).min(1),
});

/** A single fee line item with raw amount, optional USD value, and token metadata. */
export const QuoteFeeEntrySchema = z.object({
    /** Raw fee amount in token smallest units. */
    amount: z.string(),
    /** USD equivalent of the fee (decimal string). */
    amountUsd: amountUsdSchema,
    /** Token metadata for display (symbol, decimals, address). */
    token: z
        .object({
            symbol: z.string(),
            decimals: z.number().int().nonnegative(),
            address: z.string().optional(),
        })
        .optional(),
});

/** Standardized fee breakdown populated by provider adapters. */
export const QuoteFeesSchema = z.object({
    /** Bridge / relayer fee charged by the protocol. */
    bridgeFee: QuoteFeeEntrySchema.optional(),
    /** Bridge fee as a percentage (wei-encoded, 1e18 = 100%). */
    bridgeFeePct: z.string().optional(),
    /** Estimated origin-chain gas cost. */
    originGas: QuoteFeeEntrySchema.optional(),
});

/** Protocol-specific tracking identifier available at quote time. */
export const QuoteTrackingSchema = z.object({
    /** Order identifier used by the protocol's tracking endpoint. */
    orderId: z.string().optional(),
});

export const QuoteSchema = z.object({
    order: OrderSchema,
    preview: QuotePreviewSchema,
    validUntil: z.number().int().nonnegative().optional(),
    eta: z.number().int().nonnegative().optional(),
    provider: z.string(),
    quoteId: z.string().optional(),
    failureHandling: z.string().optional(),
    partialFill: z.boolean().optional(),
    fallbackToken: QuotePreviewEntrySchema.optional(),
    fees: QuoteFeesSchema.optional(),
    tracking: QuoteTrackingSchema.optional(),
    latencyMs: z.number().int().nonnegative().optional(),
    metadata: z.record(z.unknown()).optional(),
});

// ── Types ───────────────────────────────────────────────

export type QuoteFeeEntry = z.infer<typeof QuoteFeeEntrySchema>;
export type QuoteFees = z.infer<typeof QuoteFeesSchema>;
export type QuoteTracking = z.infer<typeof QuoteTrackingSchema>;
export type QuotePreviewEntry = z.infer<typeof QuotePreviewEntrySchema>;
export type QuotePreview = z.infer<typeof QuotePreviewSchema>;
export type Quote = z.infer<typeof QuoteSchema>;

/** A quote enriched with internal SDK routing fields. */
export interface ExecutableQuote extends Quote {
    /** @internal Identifies which SDK provider handles this quote */
    _providerId: string;
}

/** Response from submitting an order to a provider. */
export interface SubmitOrderResponse {
    /** The order identifier from the solver */
    orderId: Hex;
    /** Status string from the solver */
    status?: string;
    /** Optional message from the solver */
    message?: string;
}

export interface GetQuotesError {
    error: Error;
    errorMsg: string;
    /** Time elapsed in milliseconds until the provider call failed or timed out. */
    latencyMs?: number;
}

export interface GetQuotesResponse {
    quotes: ExecutableQuote[];
    errors: GetQuotesError[];
}
