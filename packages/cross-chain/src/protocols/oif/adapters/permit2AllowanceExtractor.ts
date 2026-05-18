/**
 * Reads a Permit2 EIP-712 payload and returns the ERC-20 allowances the user
 * needs before the settler can pull the funds.
 *
 * The settler moves the user's tokens with `PERMIT2.permitWitnessTransferFrom(...)`,
 * so the user has to have done `approve(PERMIT2, ...)` first. The
 * `message.spender` field is the settler, not the target of the `approve`.
 */

import type { OifEscrowOrder } from "@openintentsframework/oif-specs";
import type { Address } from "viem";
import { getAddress } from "viem";

import type { AllowanceCheck } from "../../../core/interfaces/approval.interface.js";
import { CANONICAL_PERMIT2_ADDRESS } from "../../../core/constants/permit2.js";

const LOG_PREFIX = "[permit2AllowanceExtractor]";

const SINGLE_PERMIT_TYPES: ReadonlySet<string> = new Set([
    "PermitTransferFrom",
    "PermitWitnessTransferFrom",
]);

const BATCH_PERMIT_TYPES: ReadonlySet<string> = new Set([
    "PermitBatchTransferFrom",
    "PermitBatchWitnessTransferFrom",
]);

type EscrowPayload = OifEscrowOrder["payload"];

interface TokenPermission {
    token: string;
    amount: string;
}

/** Extracts the ERC-20 allowances from a validated Permit2 escrow payload. */
export function extractPermit2Allowances(
    payload: EscrowPayload,
    signer: Address,
): AllowanceCheck[] {
    const permitted = readPermittedEntries(payload);
    if (permitted.length === 0) return [];

    const chainId = Number((payload.domain as { chainId: number | string }).chainId);
    const owner = getAddress(signer);
    const totalsByToken = sumAmountsByToken(permitted);

    return Array.from(totalsByToken, ([tokenAddress, required]) => ({
        chainId,
        tokenAddress,
        owner,
        spender: CANONICAL_PERMIT2_ADDRESS,
        required: required.toString(),
        preferInfinite: true,
    }));
}

// ── helpers ─────────────────────────────────────────────

function readPermittedEntries(payload: EscrowPayload): TokenPermission[] {
    const { primaryType } = payload;
    const { permitted } = payload.message as {
        permitted: TokenPermission | TokenPermission[];
    };

    if (SINGLE_PERMIT_TYPES.has(primaryType)) return [permitted as TokenPermission];
    if (BATCH_PERMIT_TYPES.has(primaryType)) return permitted as TokenPermission[];

    console.warn(`${LOG_PREFIX} Unknown primaryType: ${primaryType}`);
    return [];
}

function sumAmountsByToken(permitted: TokenPermission[]): Map<Address, bigint> {
    const totals = new Map<Address, bigint>();
    for (const { token, amount } of permitted) {
        const checksummed = getAddress(token);
        totals.set(checksummed, (totals.get(checksummed) ?? 0n) + BigInt(amount));
    }
    return totals;
}
