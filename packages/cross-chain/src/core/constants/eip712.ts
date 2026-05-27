import type { Address } from "viem";
import { getAddress } from "viem";

/** Permit2 (Uniswap) — same CREATE2-deployed address on every EVM chain. */
export const PERMIT2_ADDRESS: Address = getAddress("0x000000000022D473030F116dDEE9F6B43aC78BA3");

export const PERMIT2_SINGLE_PRIMARY_TYPES: ReadonlySet<string> = new Set([
    "PermitTransferFrom",
    "PermitWitnessTransferFrom",
]);

export const PERMIT2_BATCH_PRIMARY_TYPES: ReadonlySet<string> = new Set([
    "PermitBatchTransferFrom",
    "PermitBatchWitnessTransferFrom",
]);

export const PERMIT2_PRIMARY_TYPES: ReadonlySet<string> = new Set([
    ...PERMIT2_SINGLE_PRIMARY_TYPES,
    ...PERMIT2_BATCH_PRIMARY_TYPES,
]);

export const EIP3009_PRIMARY_TYPES: ReadonlySet<string> = new Set([
    "TransferWithAuthorization",
    "ReceiveWithAuthorization",
]);

/** Wall-clock tolerance for `deadline` / `validBefore` checks. */
export const DEFAULT_DEADLINE_SKEW_SECONDS = 60;
