import { getAddress, Hex } from "viem";
import { arbitrumSepolia, baseSepolia, sepolia } from "viem/chains";

export const ACROSS_ORDER_DATA_ABI = [
    {
        type: "tuple",
        components: [
            { type: "address", name: "inputToken" },
            { type: "uint256", name: "inputAmount" },
            { type: "address", name: "outputToken" },
            { type: "uint256", name: "outputAmount" },
            { type: "uint256", name: "destinationChainId" },
            { type: "bytes32", name: "recipient" },
            { type: "address", name: "exclusiveRelayer" },
            { type: "uint256", name: "depositNonce" },
            { type: "uint32", name: "exclusivityParameter" },
            { type: "bytes", name: "message" },
        ],
    },
];

export const ACROSS_ORDER_DATA_TYPE =
    "0x9df4b782e7bbc178b3b93bfe8aafb909e84e39484d7f3c59f400f1b4691f85e2";

// Contract addresses for the OIF adapter to the settler contract deployed by Across on each chain
export const ACROSS_OIF_ADAPTER_CONTRACT_ADDRESSES: Record<number, Hex> = {
    [sepolia.id]: getAddress("0x73f70aabdad84cc5d6f58c85e655eaf1edeb9184"),
    [baseSepolia.id]: getAddress("0x0e767d39c878ac33296ac1c71f8d8631c6d2ecfb"),
    [arbitrumSepolia.id]: getAddress("0x2158c256b2d9b2b58d90d3dda1b6a90d64498f7d"),
} as const;

export const ACROSS_TESTING_API_URL = "https://testnet.across.to/api";

// Gas limit for the open transaction
// Obtained from previous transactions
export const ACROSS_OPEN_GAS_LIMIT = 2600_00n;

/**
 * Across SpokePool contract addresses on each chain
 * Used for watching fill events on destination chains
 *
 * NOTE: These are HARDCODED testnet addresses
 * TODO: Support mainnet addresses and make this configurable
 * TODO: Consider fetching these dynamically or from a registry
 */
export const ACROSS_SPOKE_POOL_ADDRESSES: Record<number, Hex> = {
    [sepolia.id]: getAddress("0x5ef6C01E11889d86803e0B23e3cB3F9E9d97B662"),
    [baseSepolia.id]: getAddress("0x82B564983aE7274c86695917BBf8C99ECB6F0F8F"),
    [arbitrumSepolia.id]: getAddress("0x7E63A5f1a8F0B4d0934B2f2327DAED3F6bb2ee75"),
} as const;

/**
 * FilledRelay event ABI for Across V3
 */
export const ACROSS_FILLED_RELAY_EVENT_ABI = [
    {
        anonymous: false,
        type: "event",
        name: "FilledRelay",
        inputs: [
            { indexed: false, internalType: "bytes32", name: "inputToken", type: "bytes32" },
            { indexed: false, internalType: "bytes32", name: "outputToken", type: "bytes32" },
            { indexed: false, internalType: "uint256", name: "inputAmount", type: "uint256" },
            { indexed: false, internalType: "uint256", name: "outputAmount", type: "uint256" },
            {
                indexed: false,
                internalType: "uint256",
                name: "repaymentChainId",
                type: "uint256",
            },
            { indexed: true, internalType: "uint256", name: "originChainId", type: "uint256" },
            { indexed: true, internalType: "uint256", name: "depositId", type: "uint256" },
            { indexed: false, internalType: "uint32", name: "fillDeadline", type: "uint32" },
            {
                indexed: false,
                internalType: "uint32",
                name: "exclusivityDeadline",
                type: "uint32",
            },
            {
                indexed: false,
                internalType: "bytes32",
                name: "exclusiveRelayer",
                type: "bytes32",
            },
            { indexed: true, internalType: "bytes32", name: "relayer", type: "bytes32" },
            { indexed: false, internalType: "bytes32", name: "depositor", type: "bytes32" },
            { indexed: false, internalType: "bytes32", name: "recipient", type: "bytes32" },
            { indexed: false, internalType: "bytes32", name: "messageHash", type: "bytes32" },
            {
                indexed: false,
                internalType: "struct V3SpokePoolInterface.V3RelayExecutionEventInfo",
                name: "relayExecutionInfo",
                type: "tuple",
                components: [
                    { internalType: "bytes32", name: "updatedRecipient", type: "bytes32" },
                    { internalType: "bytes32", name: "updatedMessageHash", type: "bytes32" },
                    { internalType: "uint256", name: "updatedOutputAmount", type: "uint256" },
                    {
                        internalType: "enum V3SpokePoolInterface.FillType",
                        name: "fillType",
                        type: "uint8",
                    },
                ],
            },
        ],
    },
] as const;

/**
 * Event signature for FilledRelay event
 * Obtained from actual Base Sepolia testnet transaction
 */
export const ACROSS_FILLED_RELAY_SIGNATURE =
    "0x44b559f101f8fbcc8a0ea43fa91a05a729a5ea6e14a7c75aa750374690137208" as const;
