import { z } from "zod";

import {
    SampleSwapOpenParamsSchema,
    SampleTransferOpenParamsSchema,
} from "../schemas/SampleOpenParams.schema.js";

export type SampleTransferOpenParams = z.infer<typeof SampleTransferOpenParamsSchema>;

export type SampleSwapOpenParams = z.infer<typeof SampleSwapOpenParamsSchema>;

export type SampleOpenParams = SampleTransferOpenParams | SampleSwapOpenParams;
