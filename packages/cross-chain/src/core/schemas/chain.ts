import { chainIdSchema } from "./common.js";

/**
 * A chain ID.
 *
 * Accepts any positive safe integer. The SDK does not keep a curated list;
 * bridging support is decided by the registered providers at runtime, and
 * generic chain lookups resolve against viem's catalogue.
 *
 * Delegates validation to `chainIdSchema` so the rules live in one place.
 */
export const SupportedChainIdSchema = chainIdSchema;
