import type { Address, Hex } from "viem";
import { decodeFunctionData, erc20Abi, getAddress, isAddressEqual } from "viem";

import type {
    SpenderValidator,
    SpenderViolation,
} from "../interfaces/spenderValidator.interface.js";
import type { SignatureStep, TransactionStep } from "../schemas/order.js";
import type { Quote } from "../schemas/quote.js";
import type { SpenderAllowlist } from "../schemas/spenderAllowlist.js";
import { EIP3009_PRIMARY_TYPES, PERMIT2_PRIMARY_TYPES } from "../constants/eip712.js";

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
        targets.push(step.kind === "transaction" ? transactionTarget(step) : signatureTarget(step));
    }

    return targets;
}

/** Counterparty derived from the payload: the decoded `approve` spender, otherwise the call's `to`. */
function transactionTarget(step: TransactionStep): Target {
    const spender = decodeApproveSpender(step.transaction.data);
    return spender
        ? { chainId: step.chainId, field: "spender", received: spender }
        : { chainId: step.chainId, field: "transactionTo", received: step.transaction.to };
}

/** Permit2 `spender` or EIP-3009 `to` from the message; any other signature is fail-closed. */
function signatureTarget(step: SignatureStep): Target {
    const { primaryType, message } = step.signaturePayload;

    if (PERMIT2_PRIMARY_TYPES.has(primaryType) && typeof message.spender === "string") {
        return { chainId: step.chainId, field: "spender", received: message.spender };
    }
    if (EIP3009_PRIMARY_TYPES.has(primaryType) && typeof message.to === "string") {
        return { chainId: step.chainId, field: "signatureRecipient", received: message.to };
    }
    return { chainId: step.chainId, field: "signatureRecipient", received: primaryType };
}

function decodeApproveSpender(data: string): string | null {
    try {
        const { functionName, args } = decodeFunctionData({ abi: erc20Abi, data: data as Hex });
        return functionName === "approve" ? (args[0] as string) : null;
    } catch {
        return null;
    }
}
