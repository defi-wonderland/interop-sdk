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
 * EIP-7683 Open event ABI
 * Emitted when a cross-chain order is opened on a settlement contract
 *
 * NOTE: The resolvedOrder tuple contains additional fields beyond what's defined here
 * (e.g., maxSpent, minReceived, fillInstructions). We only decode the fields needed
 * for intent tracking. The full structure is available in the raw event data.
 *
 * @see https://www.erc7683.org/
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
                    // NOTE: Additional fields (maxSpent, minReceived, fillInstructions) omitted for simplicity
                    // They can be accessed from the raw event data if needed
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
