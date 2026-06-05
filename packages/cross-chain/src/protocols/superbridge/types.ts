import { z } from "zod";

/** Execution modes supported by the Superbridge provider. */
export const SuperbridgeSubmissionModeSchema = z.enum(["user-transaction", "gasless"]);

/** Schema for validating Superbridge provider configuration. */
export const SuperbridgeConfigSchema = z.object({
    /** Custom API base URL. Overrides the default Superbridge endpoint. */
    baseUrl: z.url().optional(),
    /** Unique provider identifier. Defaults to `"superbridge"`. */
    providerId: z.string().optional(),
    /** Superbridge API key sent as the `x-api-key` header. Required to use the provider. */
    apiKey: z.string().min(1, "Superbridge requires an apiKey"),
    /** Execution modes (default: `["user-transaction"]`). Add `"gasless"` for signature-based submission. */
    submissionModes: z.array(SuperbridgeSubmissionModeSchema).optional(),
});

/** Execution mode for a Superbridge quote. */
export type SuperbridgeSubmissionMode = z.infer<typeof SuperbridgeSubmissionModeSchema>;

/** Configuration options for the Superbridge provider. */
export type SuperbridgeConfigs = z.infer<typeof SuperbridgeConfigSchema>;
