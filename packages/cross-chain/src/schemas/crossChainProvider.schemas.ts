import { z } from "zod";

export const TransferGetQuoteParamsSchema = z.object({
    inputTokenAddress: z.string(),
    outputTokenAddress: z.string(),
    inputAmount: z.string(),
    inputChainId: z.string(),
    outputChainId: z.string(),
});

export const SwapGetQuoteParamsSchema = z.object({
    inputAmount: z.string(),
    outputAmount: z.string(),
    inputTokenAddress: z.string(),
    outputTokenAddress: z.string(),
    inputChainId: z.string(),
    outputChainId: z.string(),
    slippage: z.string(),
});
