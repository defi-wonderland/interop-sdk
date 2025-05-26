import { z } from "zod";

const SampleTransferOpenParamsSchema = z.object({
    action: z.literal("crossChainTransfer"),
    params: z.object({
        inputTokenAddress: z.string(),
        outputTokenAddress: z.string(),
        inputAmount: z.string(),
        inputChainId: z.number(),
        outputChainId: z.number(),
    }),
});

const SampleSwapOpenParamsSchema = z.object({
    action: z.literal("crossChainSwap"),
    params: z.object({
        inputAmount: z.string(),
        outputAmount: z.string(),
        inputTokenAddress: z.string(),
        outputTokenAddress: z.string(),
        inputChainId: z.number(),
        outputChainId: z.number(),
        slippage: z.string(),
    }),
});

export const SampleOpenParamsSchema = z.union([
    SampleTransferOpenParamsSchema,
    SampleSwapOpenParamsSchema,
]);
