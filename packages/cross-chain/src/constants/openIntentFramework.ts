/**
 * TypeScript types for decoded EIP-7683 Open event data
 */
import type { Address, Hex } from "viem";

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
