import { z } from "zod";

import { addressString, chainIdSchema } from "./common.js";

/** Consumer-owned, per-chain list of trusted counterparties. The SDK validates quotes against it but never decides or maintains the canonical addresses itself. */
export const SpenderAllowlistSchema = z.record(
    z.coerce.number().pipe(chainIdSchema),
    z.array(addressString).min(1),
);

export type SpenderAllowlist = z.infer<typeof SpenderAllowlistSchema>;
