import { isAddress, isHex } from "viem";
import { z } from "zod";

import { ACROSS_ORDER_DATA_TYPE } from "../internal.js";

export const AcrossTransferOpenParamsSchema = z.object({
    action: z.literal("crossChainTransfer"),
    params: z.object({
        inputChainId: z.number(),
        outputChainId: z.number(),
        inputTokenAddress: z.string().refine((val) => isAddress(val), {
            message: "Invalid input token address",
        }),
        outputTokenAddress: z.string().refine((val) => isAddress(val), {
            message: "Invalid output token address",
        }),
        sender: z.string().refine((val) => isAddress(val), {
            message: "Invalid sender address",
        }),
        recipient: z.string().refine((val) => isAddress(val), {
            message: "Invalid recipient address",
        }),
        inputAmount: z.bigint(),
        fillDeadline: z.number(),
        orderDataType: z.literal(ACROSS_ORDER_DATA_TYPE),
        orderData: z.string().refine((val) => isHex(val), {
            message: "Invalid order data",
        }),
    }),
});
