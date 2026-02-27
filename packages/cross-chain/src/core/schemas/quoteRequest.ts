import { z } from "zod";

import { InteropAccountIdSchema } from "./interopAccountId.js";

const amountSchema = z
    .string()
    .regex(/^[0-9]+$/)
    .describe("Token amount in smallest unit (decimal string, no decimals or scientific notation)");

export const IntentInputSchema = z.object({
    asset: InteropAccountIdSchema,
    amount: amountSchema.optional(),
});

export const IntentOutputSchema = z.object({
    asset: InteropAccountIdSchema,
    amount: amountSchema.optional(),
    recipient: z.string().optional(),
    calldata: z.string().optional(),
});

export const QuoteRequestSchema = z.object({
    user: z.string(),
    input: IntentInputSchema,
    output: IntentOutputSchema,
    swapType: z.union([z.literal("exact-input"), z.literal("exact-output")]).optional(),
});
