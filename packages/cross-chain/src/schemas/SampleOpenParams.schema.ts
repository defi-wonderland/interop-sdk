import { z } from "zod";

/**
 * The base schema for the Sample open params.
 */
const BaseSampleParamsSchema = z.object({
    sender: z.string(),
    recipient: z.string(),
    inputTokenAddress: z.string(),
    outputTokenAddress: z.string(),
    inputAmount: z.string(),
    inputChainId: z.number(),
    outputChainId: z.number(),
});

/**
 * The schema for the Sample transfer open params.
 * @param Action - The action type.
 * @extends BaseSampleParamsSchema
 * @param Params - BaseSampleParamsSchema: The parameters for the action.
 */
export const SampleTransferOpenParamsSchema = z.object({
    action: z.literal("crossChainTransfer"),
    params: BaseSampleParamsSchema,
});

/**
 * The schema for the Sample swap open params.
 * @param Action - The action type.
 * @extends BaseSampleParamsSchema
 * @param Params - BaseSampleParamsSchema: The parameters for the action.
 * @param Params.slippage - The slippage for the swap.
 */
export const SampleSwapOpenParamsSchema = z.object({
    action: z.literal("crossChainSwap"),
    params: BaseSampleParamsSchema.extend({
        slippage: z.string(),
    }),
});

export const SampleOpenParamsSchema = z.union([
    SampleTransferOpenParamsSchema,
    SampleSwapOpenParamsSchema,
]);
