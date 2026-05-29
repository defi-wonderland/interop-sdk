import type { SpenderAllowlist, SpenderValidator } from "../internal.js";
import { AllowlistSpenderValidator, SpenderAllowlistSchema } from "../internal.js";

export interface CreateSpenderValidatorConfig {
    /** Per-chain allowlist of trusted spender and transaction-target addresses. */
    trustedSpenders: SpenderAllowlist;
}

export function createSpenderValidator(config: CreateSpenderValidatorConfig): SpenderValidator {
    return new AllowlistSpenderValidator(SpenderAllowlistSchema.parse(config.trustedSpenders));
}
