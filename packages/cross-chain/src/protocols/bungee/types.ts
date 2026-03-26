import { z } from "zod";

/** Schema for validating Bungee provider configuration. */
export const BungeeConfigSchema = z.object({
    /** Custom API base URL override. */
    baseUrl: z.string().url().optional(),
    /** Unique provider identifier. Defaults to `"bungee"`. */
    providerId: z.string().optional(),
    /** Bungee API key for authentication. */
    apiKey: z.string().optional(),
});

/** Configuration options for {@link BungeeProvider}. */
export type BungeeConfigs = z.infer<typeof BungeeConfigSchema>;
