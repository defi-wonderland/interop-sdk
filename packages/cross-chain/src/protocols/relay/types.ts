import { z } from "zod";

/** Default Relay API base URL. */
export const RELAY_BASE_URL = "https://api.relay.link";

/** Schema for validating Relay provider configuration. */
export const RelayConfigSchema = z.object({
    /** Custom API base URL. Defaults to `https://api.relay.link`. */
    baseUrl: z.string().url().optional(),
    /** Unique provider identifier. Defaults to `"relay"`. */
    providerId: z.string().optional(),
    /** Relay API key for authentication. Required in production. */
    apiKey: z.string().optional(),
});

/** Configuration options for {@link RelayProvider}. */
export type RelayConfigs = z.infer<typeof RelayConfigSchema>;
