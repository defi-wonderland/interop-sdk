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
const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3" as Address;

const SINGLE_TOKEN_TYPES = ["PermitTransferFrom", "PermitWitnessTransferFrom"] as const;
const BATCH_TOKEN_TYPES = ["PermitBatchTransferFrom", "PermitBatchWitnessTransferFrom"] as const;

interface TokenPermission {
    token: string;
    amount: string;
}

type EscrowPayload = OifEscrowOrder["payload"];

/**
 * Turn a Permit2 EIP-712 payload into `AllowanceCheck`s.
 *
 * Returns `[]` and logs a warning on unknown `primaryType`, an invalid
 * `chainId`, or malformed entries — never throws.
 *
 * The signer comes from outside because Permit2 messages don't carry the
 * token owner: the signature itself identifies them.
 */
export function extractPermit2Allowances(
    payload: EscrowPayload,
    signer: Address,
): AllowanceCheck[] {
    const message = payload.message as Record<string, unknown>;
    const domain = payload.domain as Record<string, unknown>;

    const permitted = readPermitted(payload.primaryType, message);
    if (permitted.length === 0) return [];

    const chainId = readChainId(domain);
    if (chainId === null) return [];

    const owner = getAddress(signer);
    const totalsByToken = sumAmountsByToken(permitted);

    return Array.from(totalsByToken, ([tokenAddress, required]) => ({
        chainId,
        tokenAddress,
        owner,
        spender: PERMIT2_ADDRESS,
        required: required.toString(),
    }));
}

// ── helpers ─────────────────────────────────────────────

/** Reads the `permitted` field and normalizes it to an array. */
function readPermitted(primaryType: string, message: Record<string, unknown>): TokenPermission[] {
    const { permitted } = message;

    if ((SINGLE_TOKEN_TYPES as readonly string[]).includes(primaryType)) {
        if (!isTokenPermissionLike(permitted)) {
            console.warn(
                `[permit2AllowanceExtractor] Malformed permitted for ${primaryType}: expected object`,
            );
            return [];
        }
        return [permitted];
    }

    if ((BATCH_TOKEN_TYPES as readonly string[]).includes(primaryType)) {
        if (!Array.isArray(permitted)) {
            console.warn(
                `[permit2AllowanceExtractor] Malformed permitted for ${primaryType}: expected array`,
            );
            return [];
        }
        return permitted as TokenPermission[];
    }

    console.warn(`[permit2AllowanceExtractor] Unknown primaryType: ${primaryType}`);
    return [];
}

/** Narrow guard: the value looks like a `TokenPermission` object (shape checked later). */
function isTokenPermissionLike(value: unknown): value is TokenPermission {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Reads `domain.chainId` as a positive finite number, or `null` if it isn't. */
function readChainId(domain: Record<string, unknown>): number | null {
    const chainId = Number(domain.chainId);
    if (Number.isFinite(chainId) && chainId > 0) return chainId;
    console.warn(`[permit2AllowanceExtractor] Invalid domain.chainId: ${String(domain.chainId)}`);
    return null;
}

/** Groups `permitted` by checksummed token address, summing amounts per token. */
function sumAmountsByToken(permitted: TokenPermission[]): Map<Address, bigint> {
    const totals = new Map<Address, bigint>();
    for (const entry of permitted) {
        try {
            const token = getAddress(entry.token);
            totals.set(token, (totals.get(token) ?? 0n) + BigInt(entry.amount));
        } catch {
            console.warn(
                "[permit2AllowanceExtractor] Skipping permitted entry with invalid token/amount",
            );
        }
    }
    return totals;
}
