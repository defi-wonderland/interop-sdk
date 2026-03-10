import { z } from "zod";

import { addressString, amountSchema, chainIdSchema } from "./common.js";

export const IntentInputSchema = z.object({
    chainId: chainIdSchema,
    assetAddress: addressString,
    amount: amountSchema.optional(),
});

export const IntentOutputSchema = z.object({
    chainId: chainIdSchema,
    assetAddress: addressString,
    amount: amountSchema.optional(),
    recipient: addressString.optional(),
    calldata: z
        .string()
        .regex(/^0x([0-9a-fA-F]{2})*$/, "Invalid calldata hex")
        .optional(),
});

export const QuoteRequestSchema = z
    .object({
        user: addressString,
        input: IntentInputSchema,
        output: IntentOutputSchema,
        swapType: z.union([z.literal("exact-input"), z.literal("exact-output")]).optional(),
    })
    .refine(
        (val) => {
            const swapType = val.swapType ?? "exact-input";
            if (swapType === "exact-input") return val.input.amount !== undefined;
            if (swapType === "exact-output") return val.output.amount !== undefined;
            return true;
        },
        {
            message: "exact-input requires input.amount, exact-output requires output.amount",
        },
    );

// ── Build Quote Request ─────────────────────────────────

export const BuildQuoteInputSchema = z.object({
    chainId: chainIdSchema,
    assetAddress: addressString,
    amount: amountSchema,
});

export const BuildQuoteOutputSchema = z.object({
    chainId: chainIdSchema,
    assetAddress: addressString,
    amount: amountSchema,
    recipient: addressString.optional(),
    calldata: z
        .string()
        .regex(/^0x([0-9a-fA-F]{2})*$/, "Invalid calldata hex")
        .optional(),
});

export const BuildQuoteRequestSchema = z.object({
    user: addressString,
    input: BuildQuoteInputSchema,
    output: BuildQuoteOutputSchema,
    escrowContractAddress: addressString,
    fillDeadline: z.number().int().positive(),
    orderDataType: z.string().optional(),
    orderData: z.string().optional(),
});

// ── Types ───────────────────────────────────────────────

export type IntentInput = z.infer<typeof IntentInputSchema>;
export type IntentOutput = z.infer<typeof IntentOutputSchema>;
export type QuoteRequest = z.input<typeof QuoteRequestSchema>;
export type BuildQuoteRequest = z.infer<typeof BuildQuoteRequestSchema>;
