import { z } from "zod";

import {
    AcrossSwapOpenParamsSchema,
    AcrossTransferOpenParamsSchema,
} from "../schemas/AcrossOpenParams.schema.js";

export type SupportedSwapProtocols = "uniswap";

export type AcrossTransferOpenParams = z.infer<typeof AcrossTransferOpenParamsSchema>;

export type AcrossSwapOpenParams = z.infer<typeof AcrossSwapOpenParamsSchema>;

export type AcrossOpenParams = AcrossTransferOpenParams | AcrossSwapOpenParams;

export type AcrossConfigs = {
    swapProtocol?: SupportedSwapProtocols;
};

export type AcrossDependencies = undefined;
