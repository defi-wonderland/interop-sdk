/**
 * TypeScript types for decoded EIP-7683 Open event data
 */
// =============================================================================
// Canonical EIP-712 type definitions for OIF order signing
// =============================================================================
import type { EIP712Types, Order } from "@openintentsframework/oif-specs";
import type { Address, Hex } from "viem";

export type OifOrderType = Order["type"];

const OIF_ORDER_TYPE_SET: Record<OifOrderType, true> = {
    "oif-escrow-v0": true,
    "oif-resource-lock-v0": true,
    "oif-3009-v0": true,
    "oif-user-open-v0": true,
};

export const OIF_ORDER_TYPES = Object.keys(OIF_ORDER_TYPE_SET) as OifOrderType[];

export const OPEN_ABI = [
    {
        inputs: [
            {
                components: [
                    { internalType: "uint32", name: "fillDeadline", type: "uint32" },
                    { internalType: "bytes32", name: "orderDataType", type: "bytes32" },
                    { internalType: "bytes", name: "orderData", type: "bytes" },
                ],
                internalType: "struct OnchainCrossChainOrder",
                name: "order",
                type: "tuple",
            },
        ],
        name: "open",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
];

/**
 * EIP-7683 Output struct
 * Represents token amounts in maxSpent/minReceived arrays
 */
const OUTPUT_STRUCT_COMPONENTS = [
    { internalType: "bytes32", name: "token", type: "bytes32" },
    { internalType: "uint256", name: "amount", type: "uint256" },
    { internalType: "bytes32", name: "recipient", type: "bytes32" },
    { internalType: "uint256", name: "chainId", type: "uint256" },
] as const;

/**
 * EIP-7683 FillInstruction struct
 * Contains destination chain info and settlement data
 */
const FILL_INSTRUCTION_STRUCT_COMPONENTS = [
    { internalType: "uint256", name: "destinationChainId", type: "uint256" },
    { internalType: "bytes32", name: "destinationSettler", type: "bytes32" },
    { internalType: "bytes", name: "originData", type: "bytes" },
] as const;

/**
 * EIP-7683 Open event ABI
 * Emitted when a cross-chain order is opened on a settlement contract
 *
 * Contains the full ResolvedCrossChainOrder struct including:
 * - maxSpent: Maximum outputs the filler will send (user's input)
 * - minReceived: Minimum outputs user must receive
 * - fillInstructions: Destination chain and settlement info
 *
 * @see https://eips.ethereum.org/EIPS/eip-7683
 */
export const OPEN_EVENT_ABI = [
    {
        type: "event",
        name: "Open",
        inputs: [
            {
                indexed: true,
                internalType: "bytes32",
                name: "orderId",
                type: "bytes32",
            },
            {
                indexed: false,
                internalType: "struct ResolvedCrossChainOrder",
                name: "resolvedOrder",
                type: "tuple",
                components: [
                    { internalType: "address", name: "user", type: "address" },
                    { internalType: "uint256", name: "originChainId", type: "uint256" },
                    { internalType: "uint32", name: "openDeadline", type: "uint32" },
                    { internalType: "uint32", name: "fillDeadline", type: "uint32" },
                    { internalType: "bytes32", name: "orderId", type: "bytes32" },
                    {
                        internalType: "struct Output[]",
                        name: "maxSpent",
                        type: "tuple[]",
                        components: OUTPUT_STRUCT_COMPONENTS,
                    },
                    {
                        internalType: "struct Output[]",
                        name: "minReceived",
                        type: "tuple[]",
                        components: OUTPUT_STRUCT_COMPONENTS,
                    },
                    {
                        internalType: "struct FillInstruction[]",
                        name: "fillInstructions",
                        type: "tuple[]",
                        components: FILL_INSTRUCTION_STRUCT_COMPONENTS,
                    },
                ],
            },
        ],
    },
] as const;

/**
 * Event signature for the EIP-7683 Open event
 * Used to identify Open events in transaction receipts
 */
export const OPEN_EVENT_SIGNATURE =
    "0xa576d0af275d0c6207ef43ceee8c498a5d7a26b8157a32d3fdf361e64371628c" as const;

/** EIP-7683 Output struct (decoded) */
export interface EIP7683Output {
    token: Hex;
    amount: bigint;
    recipient: Hex;
    chainId: bigint;
}

/** EIP-7683 FillInstruction struct (decoded) */
export interface EIP7683FillInstruction {
    destinationChainId: bigint;
    destinationSettler: Hex;
    originData: Hex;
}

/** EIP-7683 ResolvedCrossChainOrder struct (decoded) */
export interface EIP7683ResolvedOrder {
    user: Address;
    originChainId: bigint;
    openDeadline: number;
    fillDeadline: number;
    orderId: Hex;
    maxSpent: readonly EIP7683Output[];
    minReceived: readonly EIP7683Output[];
    fillInstructions: readonly EIP7683FillInstruction[];
}

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
