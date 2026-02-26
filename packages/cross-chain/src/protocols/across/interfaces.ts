import { z } from "zod";

import {
    AcrossConfigSchema,
    AcrossGetQuoteParamsSchema,
    AcrossGetQuoteResponseSchema,
} from "../../internal.js";

export type AcrossGetQuoteParams = z.infer<typeof AcrossGetQuoteParamsSchema>;

export type AcrossGetQuoteResponse = z.infer<typeof AcrossGetQuoteResponseSchema>;

export type AcrossConfigs = z.input<typeof AcrossConfigSchema>;
