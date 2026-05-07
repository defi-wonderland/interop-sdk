/**
 * TypeScript types for decoded EIP-7683 Open event data
 */
// =============================================================================
// Canonical EIP-712 type definitions for OIF order signing
// =============================================================================
import type { EIP712Types, Order } from "@openintentsframework/oif-specs";
import type { Address } from "viem";

export type OifOrderType = Order["type"];

const OIF_ORDER_TYPE_SET: Record<OifOrderType, true> = {
    "oif-escrow-v0": true,
    "oif-resource-lock-v0": true,
    "oif-3009-v0": true,
    "oif-user-open-v0": true,
};

export const OIF_ORDER_TYPES = Object.keys(OIF_ORDER_TYPE_SET) as OifOrderType[];

// =============================================================================
// OIF deployed contract addresses (current solver deployment)
// =============================================================================

/**
 * InputSettlerEscrow / OutputSettler deployments per chain.
 *
 * TODO(change): OIF will rotate the InputSettler / OutputSettler addresses.
 * Update both maps below when the new deployments are announced.
 */
export const OIF_INPUT_SETTLER_ESCROW_BY_CHAIN: Record<number, Address> = {
    42161: "0x79750615FD0c3DBE3bBCD7e8E7BDdCbB554b10a8", // Arbitrum
    8453: "0x2778258002a69a0cB1DfD29b360a0bB1654C8652", // Base
    10: "0x2778258002a69a0cB1DfD29b360a0bB1654C8652", // Optimism
};

export const OIF_OUTPUT_SETTLER_BY_CHAIN: Record<number, Address> = {
    42161: "0x28E8D349d76bf9d553452bF6f02279196E7c5929", // Arbitrum
    8453: "0x2404F8e3c37c002c89bA78086a119e68E3fF8824", // Base
    10: "0x2404F8e3c37c002c89bA78086a119e68E3fF8824", // Optimism
};

/** Hyperlane BroadcasterOracle, same on all mainnet chains. */
export const OIF_BROADCASTER_ORACLE: Address = "0x0b88D54A39F330Dd7e773af4806BDC490c79cAB6";

// =============================================================================
// Shared ABI components
// =============================================================================

const MANDATE_OUTPUT_COMPONENTS = [
    { internalType: "bytes32", name: "oracle", type: "bytes32" },
    { internalType: "bytes32", name: "settler", type: "bytes32" },
    { internalType: "uint256", name: "chainId", type: "uint256" },
    { internalType: "bytes32", name: "token", type: "bytes32" },
    { internalType: "uint256", name: "amount", type: "uint256" },
    { internalType: "bytes32", name: "recipient", type: "bytes32" },
    { internalType: "bytes", name: "callbackData", type: "bytes" },
    { internalType: "bytes", name: "context", type: "bytes" },
] as const;

const STANDARD_ORDER_COMPONENTS = [
    { internalType: "address", name: "user", type: "address" },
    { internalType: "uint256", name: "nonce", type: "uint256" },
    { internalType: "uint256", name: "originChainId", type: "uint256" },
    { internalType: "uint32", name: "expires", type: "uint32" },
    { internalType: "uint32", name: "fillDeadline", type: "uint32" },
    { internalType: "address", name: "inputOracle", type: "address" },
    { internalType: "uint256[2][]", name: "inputs", type: "uint256[2][]" },
    {
        internalType: "struct MandateOutput[]",
        name: "outputs",
        type: "tuple[]",
        components: MANDATE_OUTPUT_COMPONENTS,
    },
] as const;

// =============================================================================
// InputSettlerEscrow ABIs
// =============================================================================

/** ABI for InputSettlerEscrow.open(StandardOrder). */
export const STANDARD_ORDER_OPEN_ABI = [
    {
        inputs: [
            {
                components: STANDARD_ORDER_COMPONENTS,
                internalType: "struct StandardOrder",
                name: "order",
                type: "tuple",
            },
        ],
        name: "open",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
] as const;

/** Open event emitted by InputSettlerEscrow: Open(bytes32 indexed orderId, StandardOrder order). */
export const OIF_OPEN_EVENT_ABI = [
    {
        type: "event",
        name: "Open",
        inputs: [
            { indexed: true, internalType: "bytes32", name: "orderId", type: "bytes32" },
            {
                indexed: false,
                internalType: "struct StandardOrder",
                name: "order",
                type: "tuple",
                components: STANDARD_ORDER_COMPONENTS,
            },
        ],
    },
] as const;

export const OIF_OPEN_EVENT_SIGNATURE =
    "0x9ff74bd56d00785b881ef9fa3f03d7b598686a39a9bcff89a6008db588b18a7b" as const;

// =============================================================================
// OutputSettler ABI
// =============================================================================

/** OutputFilled event emitted by the OutputSettler when a solver fills an order. */
export const OUTPUT_FILLED_EVENT_ABI = [
    {
        type: "event",
        name: "OutputFilled",
        inputs: [
            { indexed: true, internalType: "bytes32", name: "orderId", type: "bytes32" },
            { indexed: false, internalType: "bytes32", name: "solver", type: "bytes32" },
            { indexed: false, internalType: "uint32", name: "timestamp", type: "uint32" },
            {
                internalType: "struct MandateOutput",
                name: "output",
                type: "tuple",
                components: MANDATE_OUTPUT_COMPONENTS,
            },
            { indexed: false, internalType: "uint256", name: "fillAmount", type: "uint256" },
        ],
    },
] as const;

/**
 * Canonical EIP-712 types for oif-escrow-v0 and oif-3009-v0 orders.
 * Override solver-provided types which are currently incomplete.
 *
 * TODO: Delete this block + export in external.ts when solver sends complete payload.types
 * @see https://github.com/openintentsframework/oif-solver/issues/TODO
 */
export const PERMIT2_TYPES: EIP712Types = {
    PermitBatchWitnessTransferFrom: [
        { name: "permitted", type: "TokenPermissions[]" },
        { name: "spender", type: "address" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
        { name: "witness", type: "Permit2Witness" },
    ],
    Permit2Witness: [
        { name: "user", type: "address" },
        { name: "expires", type: "uint32" },
        { name: "inputOracle", type: "address" },
        { name: "outputs", type: "MandateOutput[]" },
    ],
    MandateOutput: [
        { name: "oracle", type: "bytes32" },
        { name: "settler", type: "bytes32" },
        { name: "chainId", type: "uint256" },
        { name: "token", type: "bytes32" },
        { name: "amount", type: "uint256" },
        { name: "recipient", type: "bytes32" },
        { name: "callbackData", type: "bytes" },
        { name: "context", type: "bytes" },
    ],
    TokenPermissions: [
        { name: "token", type: "address" },
        { name: "amount", type: "uint256" },
    ],
};

/** @see https://eips.ethereum.org/EIPS/eip-3009 */
export const EIP3009_TYPES: EIP712Types = {
    TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" },
    ],
    ReceiveWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" },
    ],
    CancelAuthorization: [
        { name: "authorizer", type: "address" },
        { name: "nonce", type: "bytes32" },
    ],
};
