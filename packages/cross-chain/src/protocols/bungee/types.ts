import { z } from "zod";

import {
    FEE_CONFIG_REFINEMENT_ERROR,
    feeConfigRefinement,
    FeeConfigSchema,
    SubmissionModeSchema,
} from "../../core/schemas/providerConfig.js";

/** Bungee API integration tiers. */
export enum BungeeApiTier {
    /** Public sandbox — no auth, very limited RPS. For testing only. */
    Sandbox = "sandbox",
    /** Dedicated backend — API key auth, 20 RPS. For server-to-server. */
    Dedicated = "dedicated",
    /** Frontend / direct — domain whitelist, 100 RPM. For dApps and wallets. */
    Frontend = "frontend",
}

/** Schema for validating Bungee provider configuration. */
export const BungeeConfigSchema = z
    .object({
        /** API integration tier. Determines the base URL when `baseUrl` is not set. Defaults to `"sandbox"`. */
        tier: z.nativeEnum(BungeeApiTier).optional(),
        /** Custom API base URL. Overrides the URL derived from `tier`. */
        baseUrl: z.string().url().optional(),
        /** Unique provider identifier. Defaults to `"bungee"`. */
        providerId: z.string().optional(),
        /** Bungee API key for dedicated backend authentication (sent via `x-api-key`). */
        apiKey: z.string().optional(),
        /** Bungee affiliate ID for tracking (sent via `affiliate` header). */
        affiliateId: z.string().optional(),
        /** Supported transaction submission modes. `"user-transaction"` uses onchain flow, `"gasless"` uses permit2. Defaults to `["user-transaction"]`. */
        submissionModes: z.array(SubmissionModeSchema).min(1).optional(),
        /** Default slippage tolerance for quotes (e.g. `"0.5"` for 0.5%). */
        slippage: z.string().optional(),
        /** Enable native gas refueling on the destination chain. */
        refuel: z.boolean().optional(),
    })
    .merge(FeeConfigSchema)
    .refine(feeConfigRefinement, FEE_CONFIG_REFINEMENT_ERROR);

/** Configuration options for {@link BungeeProvider}. */
export type BungeeConfigs = z.infer<typeof BungeeConfigSchema>;
