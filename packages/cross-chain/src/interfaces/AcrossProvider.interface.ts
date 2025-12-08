import { z } from "zod";

import {
    AcrossConfigSchema,
    AcrossGetQuoteParamsSchema,
    AcrossGetQuoteResponseSchema,
    AcrossOIFGetQuoteParamsSchema,
} from "../internal.js";

export type AcrossGetQuoteParams = z.infer<typeof AcrossGetQuoteParamsSchema>;

export type AcrossGetQuoteResponse = z.infer<typeof AcrossGetQuoteResponseSchema>;

export type AcrossOIFGetQuoteParams = z.infer<typeof AcrossOIFGetQuoteParamsSchema>;

export type AcrossConfigs = z.infer<typeof AcrossConfigSchema>;
