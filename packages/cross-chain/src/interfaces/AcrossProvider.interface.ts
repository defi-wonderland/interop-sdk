import { Address, PublicClient } from "viem";
import { z } from "zod";

import { AcrossTransferOpenParamsSchema } from "../schemas/AcrossTransferOpenParams.schema.js";

export type AcrossTransferOpenParams = z.infer<typeof AcrossTransferOpenParamsSchema>;

export type AcrossOpenParams = AcrossTransferOpenParams;

export type AcrossConfigs = {
    userAddress: Address;
};

export type AcrossDependencies = {
    publicClient: PublicClient;
};
