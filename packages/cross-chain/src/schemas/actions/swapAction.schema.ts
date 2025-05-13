import { isAddress } from "viem";
import { z } from "zod";

export const SwapGetQuoteParamsSchema = z.object({
    inputAmount: z.string(),
    outputAmount: z.string(),
    inputTokenAddress: z.string().refine((val) => isAddress(val), {
        message: "Invalid input token address",
    }),
    outputTokenAddress: z.string().refine((val) => isAddress(val), {
        message: "Invalid output token address",
    }),
    inputChainId: z.string(),
    outputChainId: z.string(),
    slippage: z.string(),
});
