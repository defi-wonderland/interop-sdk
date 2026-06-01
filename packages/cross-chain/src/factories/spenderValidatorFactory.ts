import type { SpenderAllowlist, SpenderValidator } from "../internal.js";
import { AllowlistSpenderValidator, SpenderAllowlistSchema } from "../internal.js";

export interface CreateSpenderValidatorConfig {
    /** Per-chain allowlist of trusted spender and transaction-target addresses. */
    trustedSpenders: SpenderAllowlist;
}

export function createSpenderValidator(config: CreateSpenderValidatorConfig): SpenderValidator {
    const allowlist = SpenderAllowlistSchema.parse(config.trustedSpenders);
    if (Object.keys(allowlist).length === 0) {
        throw new Error("trustedSpenders must include at least one chain");
    }
    return new AllowlistSpenderValidator(allowlist);
}
