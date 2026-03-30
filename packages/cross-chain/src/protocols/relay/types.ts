import { z } from "zod";

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
    /** Execution modes: `["user-transaction"]`, `["gasless"]`, or both (default: `["user-transaction"]`). When `"gasless"` is included, quotes request permit-based execution; tokens supporting EIP-3009 (e.g. USDC) are fully gasless, others still require a one-time approval transaction. */
    submissionModes: z.array(z.enum(["user-transaction", "gasless"])).optional(),
});

/** Configuration options for {@link RelayProvider}. */
export type RelayConfigs = z.infer<typeof RelayConfigSchema>;
