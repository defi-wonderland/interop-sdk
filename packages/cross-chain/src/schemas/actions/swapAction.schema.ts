import { z } from "zod";

export const SwapGetQuoteParamsSchema = z.object({
    inputAmount: z.string(),
    outputAmount: z.string(),
    inputTokenAddress: z.string(),
    outputTokenAddress: z.string(),
    inputChainId: z.string(),
    outputChainId: z.string(),
    slippage: z.string(),
});
