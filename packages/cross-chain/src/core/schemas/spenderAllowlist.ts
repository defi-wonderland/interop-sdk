import { z } from "zod";

import { addressString, chainIdSchema } from "./common.js";

/**
 * Consumer-owned trusted address list. The SDK doesn't maintain protocol deployment
 * addresses, so it doesn't decide which settlers or routers are the canonical ones.
 * It validates each quote's counterparties against a list the consumer provides and
 * maintains. A built-in list of trusted settlers may land later; for now it's yours to own.
 */
export const SpenderAllowlistSchema = z.record(
    z.coerce.number().pipe(chainIdSchema),
    z.array(addressString).min(1),
);

export type SpenderAllowlist = z.infer<typeof SpenderAllowlistSchema>;
