import { z } from "zod";

import { AcrossTransferOpenParamsSchema } from "../schemas/AcrossTransferOpenParams.schema.js";

export type AcrossTransferOpenParams = z.infer<typeof AcrossTransferOpenParamsSchema>;

export type AcrossOpenParams = AcrossTransferOpenParams;

export type AcrossConfigs = undefined;

export type AcrossDependencies = undefined;
