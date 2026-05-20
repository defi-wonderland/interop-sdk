import { getAddress } from "viem";

/** Permit2 is deployed at the same address on every supported EVM chain. */
export const CANONICAL_PERMIT2_ADDRESS = getAddress("0x000000000022D473030F116dDEE9F6B43aC78BA3");

/** EIP-712 primaryType strings that target the Permit2 contract. */
export const PERMIT2_PRIMARY_TYPES: ReadonlySet<string> = new Set([
    "PermitTransferFrom",
    "PermitWitnessTransferFrom",
    "PermitBatchTransferFrom",
    "PermitBatchWitnessTransferFrom",
]);

/** Subset of {@link PERMIT2_PRIMARY_TYPES} whose `permitted` is a batch array. */
export const PERMIT2_BATCH_PRIMARY_TYPES: ReadonlySet<string> = new Set([
    "PermitBatchTransferFrom",
    "PermitBatchWitnessTransferFrom",
]);
