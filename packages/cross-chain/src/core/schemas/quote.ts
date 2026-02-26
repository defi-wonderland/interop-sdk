import { z } from "zod";

import { InteropAccountIdSchema } from "./interopAccountId.js";
import { OrderSchema } from "./order.js";

export const QuotePreviewInputSchema = z.object({
    account: InteropAccountIdSchema,
    asset: InteropAccountIdSchema,
    amount: z.string(),
});

export const QuotePreviewOutputSchema = z.object({
    account: InteropAccountIdSchema,
    asset: InteropAccountIdSchema,
    amount: z.string(),
});

export const QuotePreviewSchema = z.object({
    inputs: z.array(QuotePreviewInputSchema),
    outputs: z.array(QuotePreviewOutputSchema),
});

export const QuoteSchema = z.object({
    order: OrderSchema,
    preview: QuotePreviewSchema,
    validUntil: z.number().optional(),
    eta: z.number().optional(),
    provider: z.string(),
    quoteId: z.string().optional(),
    failureHandling: z.string().optional(),
    partialFill: z.boolean().optional(),
    metadata: z.record(z.unknown()).optional(),
});
