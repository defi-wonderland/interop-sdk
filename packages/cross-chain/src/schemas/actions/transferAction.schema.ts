import { z } from "zod";

export const TransferGetQuoteParamsSchema = z.object({
    inputTokenAddress: z.string(),
    outputTokenAddress: z.string(),
    inputAmount: z.string(),
    inputChainId: z.string(),
    outputChainId: z.string(),
});
