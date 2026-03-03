import { z } from "zod";

import { addressString, chainIdSchema } from "./common.js";

/**
 * Zod schema for {@link InteropAccountId}.
 *
 * Validates that `address` is a valid hex address and `chainId` is a
 * positive integer.
 */
export const InteropAccountIdSchema = z.object({
    chainId: chainIdSchema,
    address: addressString,
});

// ── Types ───────────────────────────────────────────────

/** Chain-aware account/asset identifier (EVM-focused). */
export type InteropAccountId = z.infer<typeof InteropAccountIdSchema>;
