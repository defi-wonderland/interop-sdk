import type { Address } from "viem";
import { isAddress, isAddressEqual } from "viem";

import type {
    AllowanceCheck,
    ApprovalValidationFailureHandler,
    ApprovalValidator,
} from "../../interfaces/approval.interface.js";
import type { Step } from "../../schemas/order.js";
import type { ExecutableQuote, QuotePreviewEntry } from "../../schemas/quote.js";
import { PERMIT2_ADDRESS } from "../../constants/eip712.js";
import { ApprovalValidationFailureReason } from "../../interfaces/approval.interface.js";
import { isNativeAddress } from "../../utils/token.js";
import { defaultApprovalValidationFailureHandler } from "./validationFailureHandler.js";

/** Trusted spender addresses keyed by chain id, derived from a quote's own steps. */
type TrustedSpenders = ReadonlyMap<number, ReadonlySet<Address>>;

/**
 * Default {@link ApprovalValidator}: returns an allowance check only when it
 * matches the quote's own intent, so an `approve` can never target a spender or
 * token the quote's own steps and inputs don't already use.
 *
 * A check survives when its `(chainId, tokenAddress, owner)` matches a previewed
 * input, its `spender` is canonical Permit2 or the `to` of one of the quote's own
 * transaction steps, and its `required` amount does not exceed that input.
 * `preferInfinite` is honoured only for Permit2. Rejected checks are reported via
 * the failure handler and never produce an approval step. Never throws.
 */
export class DefaultApprovalValidator implements ApprovalValidator {
    constructor(
        private readonly onViolation: ApprovalValidationFailureHandler = defaultApprovalValidationFailureHandler,
    ) {}

    validate(quote: ExecutableQuote): AllowanceCheck[] {
        const checks = quote.order.checks?.allowances ?? [];
        if (checks.length === 0) return [];

        const inputs = quote.preview.inputs;
        const trustedSpenders = collectTrustedSpenders(quote.order.steps);

        const valid: AllowanceCheck[] = [];
        for (const check of checks) {
            const reason = validationFailure(check, inputs, trustedSpenders);
            if (reason !== undefined) {
                try {
                    this.onViolation.handle({ check, reason });
                } catch {}
                continue;
            }
            valid.push(normalizePreferInfinite(check));
        }
        return valid;
    }
}

/** Default validator wired with the `console.warn` failure handler. */
export const defaultApprovalValidator: ApprovalValidator = new DefaultApprovalValidator();

function validationFailure(
    check: AllowanceCheck,
    inputs: readonly QuotePreviewEntry[],
    trustedSpenders: TrustedSpenders,
): ApprovalValidationFailureReason | undefined {
    if (isNativeAddress(check.tokenAddress, "eip155")) {
        return ApprovalValidationFailureReason.NativeAsset;
    }

    const input = inputs.find(
        (entry) =>
            entry.chainId === check.chainId && sameAddress(entry.assetAddress, check.tokenAddress),
    );
    if (input === undefined) {
        return inputs.some((entry) => entry.chainId === check.chainId)
            ? ApprovalValidationFailureReason.TokenMismatch
            : ApprovalValidationFailureReason.ChainMismatch;
    }

    if (!sameAddress(input.accountAddress, check.owner)) {
        return ApprovalValidationFailureReason.OwnerMismatch;
    }

    if (!isTrustedSpender(check, trustedSpenders)) {
        return ApprovalValidationFailureReason.UntrustedSpender;
    }

    const required = parseAmount(check.required);
    const available = parseAmount(input.amount);
    if (required === null || available === null || required > available) {
        return ApprovalValidationFailureReason.AmountExceedsInput;
    }

    return undefined;
}

function collectTrustedSpenders(steps: readonly Step[]): TrustedSpenders {
    const byChain = new Map<number, Set<Address>>();
    for (const step of steps) {
        if (step.kind !== "transaction" || step.category === "approval") continue;
        const { to } = step.transaction;
        if (!isAddress(to, { strict: false })) continue;
        const spenders = byChain.get(step.chainId) ?? new Set<Address>();
        spenders.add(to);
        byChain.set(step.chainId, spenders);
    }
    return byChain;
}

function isTrustedSpender(check: AllowanceCheck, trustedSpenders: TrustedSpenders): boolean {
    if (sameAddress(check.spender, PERMIT2_ADDRESS)) return true;
    const spenders = trustedSpenders.get(check.chainId);
    if (spenders === undefined) return false;
    for (const spender of spenders) {
        if (sameAddress(spender, check.spender)) return true;
    }
    return false;
}

function normalizePreferInfinite(check: AllowanceCheck): AllowanceCheck {
    if (!check.preferInfinite || sameAddress(check.spender, PERMIT2_ADDRESS)) return check;
    return { ...check, preferInfinite: false };
}

function parseAmount(value: string): bigint | null {
    try {
        return BigInt(value);
    } catch {
        return null;
    }
}

/** Checksum-safe equality that treats anything that isn't a valid address as unequal. */
function sameAddress(a: string, b: string): boolean {
    return (
        isAddress(a, { strict: false }) && isAddress(b, { strict: false }) && isAddressEqual(a, b)
    );
}
