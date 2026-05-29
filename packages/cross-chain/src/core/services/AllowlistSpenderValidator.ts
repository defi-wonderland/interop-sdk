import type { Address } from "viem";
import { getAddress, isAddressEqual } from "viem";

import type {
    SpenderValidator,
    SpenderViolation,
} from "../interfaces/spenderValidator.interface.js";
import type { Quote } from "../schemas/quote.js";
import type { SpenderAllowlist } from "../schemas/spenderAllowlist.js";

/** Validates quote targets against a static per-chain allowlist held by the consumer. */
export class AllowlistSpenderValidator implements SpenderValidator {
    constructor(private readonly allowlist: SpenderAllowlist) {}

    findViolation(quote: Quote): SpenderViolation | null {
        for (const target of collectTargets(quote)) {
            if (!this.isTrusted(target)) {
                return { ...target, trusted: this.allowlist[target.chainId] ?? [] };
            }
        }
        return null;
    }

    private isTrusted(target: Target): boolean {
        const trusted = this.allowlist[target.chainId];
        if (!trusted || trusted.length === 0) return false;

        let received: Address;
        try {
            received = getAddress(target.received);
        } catch {
            return false;
        }

        return trusted.some((candidate) => {
            try {
                return isAddressEqual(received, getAddress(candidate));
            } catch {
                return false;
            }
        });
    }
}

type Target = Omit<SpenderViolation, "trusted">;

function collectTargets(quote: Quote): Target[] {
    const targets: Target[] = [];

    for (const allowance of quote.order.checks?.allowances ?? []) {
        targets.push({ chainId: allowance.chainId, field: "spender", received: allowance.spender });
    }

    for (const step of quote.order.steps) {
        if (step.kind === "transaction" && step.category !== "approval") {
            targets.push({
                chainId: step.chainId,
                field: "transactionTo",
                received: step.transaction.to,
            });
        }
    }

    return targets;
}
