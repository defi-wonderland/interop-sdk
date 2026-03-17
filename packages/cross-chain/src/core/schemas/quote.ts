import type { Hex } from "viem";
import { z } from "zod";

import { addressString, amountSchema, chainIdSchema } from "./common.js";
import { OrderSchema } from "./order.js";

export const QuotePreviewEntrySchema = z.object({
    chainId: chainIdSchema,
    accountAddress: addressString,
    assetAddress: addressString,
    amount: amountSchema,
});

export const QuotePreviewSchema = z.object({
    inputs: z.array(QuotePreviewEntrySchema).min(1),
    outputs: z.array(QuotePreviewEntrySchema).min(1),
});

export const QuoteFeeEntrySchema = z.object({
    amount: z.string(),
    amountUsd: z.string().optional(),
    token: z
        .object({
            symbol: z.string(),
            decimals: z.number().int().nonnegative(),
            address: z.string().optional(),
        })
        .optional(),
});

export const QuoteFeesSchema = z.object({
    bridgeFee: QuoteFeeEntrySchema.optional(),
    bridgeFeePct: z.string().optional(),
    originGas: QuoteFeeEntrySchema.optional(),
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
    fees: QuoteFeesSchema.optional(),
    metadata: z.record(z.unknown()).optional(),
});

// ── Types ───────────────────────────────────────────────

export type QuoteFeeEntry = z.infer<typeof QuoteFeeEntrySchema>;
export type QuoteFees = z.infer<typeof QuoteFeesSchema>;
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

/** Result of executing a signature step. */
export interface StepResult {
    /** Index into order.steps[] */
    stepIndex: number;
    /** EIP-712 signature */
    signature: Hex;
}

export interface GetQuotesError {
    error: Error;
    errorMsg: string;
}

export interface GetQuotesResponse {
    quotes: ExecutableQuote[];
    errors: GetQuotesError[];
}
