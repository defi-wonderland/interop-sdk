import { isHex } from "viem";
import { z } from "zod";

import { ACROSS_ORDER_DATA_TYPE } from "../internal.js";
import { HexAddressSchema } from "./address.js";

export const AcrossTransferOpenParamsSchema = z.object({
    action: z.literal("crossChainTransfer"),
    params: z.object({
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
    }),
});
