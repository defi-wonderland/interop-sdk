import { Hex } from "viem";
import { z } from "zod";

import {
    AcrossSwapOpenParamsSchema,
    AcrossTransferOpenParamsSchema,
    SwapGetQuoteParams,
    ValidActions,
} from "../../internal.js";

export type SupportedSwapProtocols = "uniswap";

export type AcrossTransferOpenParams = z.infer<typeof AcrossTransferOpenParamsSchema>;

export type AcrossSwapOpenParams = z.infer<typeof AcrossSwapOpenParamsSchema>;

export type AcrossOpenParams<TAction extends ValidActions> = TAction extends "crossChainTransfer"
    ? AcrossTransferOpenParams
    : TAction extends "crossChainSwap"
      ? AcrossSwapOpenParams
      : never;

export type AcrossConfigs = {
    swapProtocol?: AcrossSwapMessageBuilder;
};

export type AcrossDependencies = undefined;

export interface AcrossSwapMessageBuilder {
    buildAcrossMessage(params: SwapGetQuoteParams): Hex;
}
