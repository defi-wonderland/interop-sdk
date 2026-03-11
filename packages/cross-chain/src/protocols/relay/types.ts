import { z } from "zod";

import type { GetFillParams } from "../../core/types/orderTracking.js";

/**
 * Notifies a solver about a submitted deposit transaction.
 */
export interface SolverNotifier {
    /** Notify the solver about an order's deposit transaction. */
    notify(params: GetFillParams): Promise<void>;
}

/** Schema for validating Relay provider configuration. */
export const RelayConfigSchema = z.object({
    /** Custom API base URL. Overrides the URL derived from `isTestnet`. */
    baseUrl: z.string().url().optional(),
    /** Whether to use the testnet API. Defaults to `false` (mainnet). */
    isTestnet: z.boolean().optional(),
    /** Unique provider identifier. Defaults to `"relay"`. */
    providerId: z.string().optional(),
    /** Relay API key for authentication. Required in production. */
    apiKey: z.string().optional(),
});

/** Configuration options for {@link RelayProvider}. */
export type RelayConfigs = z.infer<typeof RelayConfigSchema>;
