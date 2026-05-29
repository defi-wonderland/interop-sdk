import { z } from "zod";

import { addressString, chainIdSchema } from "./common.js";

export const SpenderAllowlistSchema = z.record(
    z.coerce.number().pipe(chainIdSchema),
    z.array(addressString).min(1),
);

export type SpenderAllowlist = z.infer<typeof SpenderAllowlistSchema>;
