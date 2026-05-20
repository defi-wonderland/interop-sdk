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
import type { Permit2TokenPermission } from "../../../core/utils/permit2.js";
import {
    CANONICAL_PERMIT2_ADDRESS,
    PERMIT2_PRIMARY_TYPES,
} from "../../../core/constants/permit2.js";
import { readPermittedEntries } from "../../../core/utils/permit2.js";

const LOG_PREFIX = "[permit2AllowanceExtractor]";

type EscrowPayload = OifEscrowOrder["payload"];

/** Extracts the ERC-20 allowances from a validated Permit2 escrow payload. */
export function extractPermit2Allowances(
    payload: EscrowPayload,
    signer: Address,
): AllowanceCheck[] {
    if (!PERMIT2_PRIMARY_TYPES.has(payload.primaryType)) {
        console.warn(`${LOG_PREFIX} Unknown primaryType: ${payload.primaryType}`);
        return [];
    }

    const permitted = readPermittedEntries(
        payload.primaryType,
        (payload.message as { permitted: unknown }).permitted,
    );
    if (permitted.length === 0) return [];

    const chainId = Number((payload.domain as { chainId: number | string }).chainId);
    const owner = getAddress(signer);

    return Array.from(sumAmountsByToken(permitted), ([tokenAddress, required]) => ({
        chainId,
        tokenAddress,
        owner,
        spender: CANONICAL_PERMIT2_ADDRESS,
        required: required.toString(),
        preferInfinite: true,
    }));
}

function sumAmountsByToken(permitted: readonly Permit2TokenPermission[]): Map<Address, bigint> {
    const totals = new Map<Address, bigint>();
    for (const { token, amount } of permitted) {
        const checksummed = getAddress(token);
        totals.set(checksummed, (totals.get(checksummed) ?? 0n) + BigInt(amount));
    }
    return totals;
}
