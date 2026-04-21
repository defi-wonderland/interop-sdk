import { z } from "zod";

/**
 * A chain ID.
 *
 * The SDK does not gate on a curated list — whether a chain is actually
 * supported for bridging is decided by the registered providers at runtime
 * via asset discovery. Generic chain-registry lookups (multicall, allowance
 * reads, etc.) resolve against the full `viem/chains` catalogue.
 */
export const SupportedChainIdSchema = z.number().int().positive();
