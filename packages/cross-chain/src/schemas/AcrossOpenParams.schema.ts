import { isHex } from "viem";
import { z } from "zod";

import { ACROSS_ORDER_DATA_TYPE } from "../internal.js";
import { HexAddressSchema } from "./address.js";

/**
 * The base schema for the Across open params.
 */
const BaseAcrossParamsSchema = z.object({
    inputChainId: z.number(),
    outputChainId: z.number(),
    inputTokenAddress: HexAddressSchema,
    outputTokenAddress: HexAddressSchema,
    sender: HexAddressSchema,
    recipient: HexAddressSchema,
    inputAmount: z.bigint(),
    fillDeadline: z.number(),
    orderDataType: z.literal(ACROSS_ORDER_DATA_TYPE),
    orderData: z.string().refine((val) => isHex(val), {
        message: "Invalid order data",
    }),
});

/**
 * The schema for the Across transfer open params.
 * @param Action - The action type.
 * @extends BaseAcrossParamsSchema
 * @param Params - BaseAcrossParamsSchema: The parameters for the action.
 */
export const AcrossTransferOpenParamsSchema = z.object({
    action: z.literal("crossChainTransfer"),
    params: BaseAcrossParamsSchema,
});

/**
 * The schema for the Across swap open params.
 * @param Action - The action type.
 * @extends BaseAcrossParamsSchema
 * @param Params - BaseAcrossParamsSchema: The parameters for the action.
 * @param Params.slippage - The slippage for the swap.
 */
export const AcrossSwapOpenParamsSchema = z.object({
    action: z.literal("crossChainSwap"),
    params: BaseAcrossParamsSchema.extend({
        slippage: z.number(),
    }),
});

export const AcrossOpenParamsSchema = z.union([
    AcrossTransferOpenParamsSchema,
    AcrossSwapOpenParamsSchema,
]);
