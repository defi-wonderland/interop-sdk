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

/** Permit2 is deployed at the same address on every EVM chain. */
const PERMIT2_ADDRESS = getAddress("0x000000000022D473030F116dDEE9F6B43aC78BA3");

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

/**
 * Returns the ERC-20 allowances a Permit2 escrow order needs from the user.
 *
 * Trusts the payload (already validated by `validateEscrowOrder`). Unknown
 * Permit2 primary types return an empty list.
 *
 * The signer is passed in because Permit2 messages don't carry the owner:
 * the signature identifies them.
 */
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
        spender: PERMIT2_ADDRESS,
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
