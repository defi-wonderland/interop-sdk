import { z } from "zod";

/**
 * Shared fee configuration for cross-chain providers that support integrator fees.
 *
 * When `feeBps` is set, `feeTakerAddress` must also be provided.
 * Apply {@link feeConfigRefinement} to enforce this constraint.
 */
export const FeeConfigSchema = z.object({
    /** Fee in basis points charged on the source amount (e.g. `"50"` for 0.5%). */
    feeBps: z.string().optional(),
    /** Address to receive the convenience fee. Required when `feeBps` is set. */
    feeTakerAddress: z.string().optional(),
});

/** Inferred type for {@link FeeConfigSchema}. */
export type FeeConfig = z.infer<typeof FeeConfigSchema>;

/** Validates that `feeTakerAddress` is present when `feeBps` is set. */
export const feeConfigRefinement = (config: FeeConfig): boolean =>
    !config.feeBps || !!config.feeTakerAddress;

/** Error details for {@link feeConfigRefinement}. */
export const FEE_CONFIG_REFINEMENT_ERROR = {
    message: "feeTakerAddress is required when feeBps is set",
    path: ["feeTakerAddress"] as string[],
};

/**
 * Cross-chain transaction submission mode.
 *
 * - `"user-transaction"`: User directly submits and pays gas.
 * - `"gasless"`: Protocol/relayer submits on behalf of the user (e.g. permit2 signatures).
 */
export const SubmissionModeSchema = z.enum(["user-transaction", "gasless"]);

/** Inferred type for {@link SubmissionModeSchema}. */
export type SubmissionMode = z.infer<typeof SubmissionModeSchema>;

/** Array of supported submission modes for a provider. */
export const SubmissionModesSchema = z.array(SubmissionModeSchema).optional();

/** Inferred type for {@link SubmissionModesSchema}. */
export type SubmissionModes = z.infer<typeof SubmissionModesSchema>;
