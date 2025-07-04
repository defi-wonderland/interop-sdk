import { Hex } from "viem";
import { z } from "zod";

import { SwapGetQuoteParams } from "../internal.js";
import {
    AcrossSwapOpenParamsSchema,
    AcrossTransferOpenParamsSchema,
} from "../schemas/AcrossOpenParams.schema.js";

export type SupportedSwapProtocols = "uniswap";

export type AcrossTransferOpenParams = z.infer<typeof AcrossTransferOpenParamsSchema>;

export type AcrossSwapOpenParams = z.infer<typeof AcrossSwapOpenParamsSchema>;

export type AcrossOpenParams = AcrossTransferOpenParams | AcrossSwapOpenParams;

export type AcrossConfigs = {
    swapProtocol?: AcrossSwapMessageBuilder;
};

export type AcrossDependencies = undefined;

export interface AcrossSwapMessageBuilder {
    buildAcrossMessage(params: SwapGetQuoteParams): Hex;
}
