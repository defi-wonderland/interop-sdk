import type { SpenderAllowlist, SpenderValidator } from "../internal.js";
import { AllowlistSpenderValidator, SpenderAllowlistSchema } from "../internal.js";

export interface CreateSpenderValidatorConfig {
    /**
     * Consumer-owned trusted address list. The SDK doesn't maintain protocol deployment
     * addresses, so it doesn't decide which settlers or routers are the canonical ones.
     */
    trustedSpenders: SpenderAllowlist;
}

/**
 * Consumer-owned trusted address list. The SDK doesn't maintain protocol deployment
 * addresses, so it doesn't decide which settlers or routers are the canonical ones.
 * It validates each quote's counterparties against a list the consumer provides and
 * maintains. A built-in list of trusted settlers may land later; for now it's yours to own.
 */
export function createSpenderValidator(config: CreateSpenderValidatorConfig): SpenderValidator {
    const allowlist = SpenderAllowlistSchema.parse(config.trustedSpenders);
    if (Object.keys(allowlist).length === 0) {
        throw new Error("trustedSpenders must include at least one chain");
    }
    return new AllowlistSpenderValidator(allowlist);
}
