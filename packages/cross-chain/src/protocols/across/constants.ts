import { getAddress, Hex } from "viem";
import { arbitrum, arbitrumSepolia, base, baseSepolia, sepolia } from "viem/chains";

import type { NetworkAssets } from "../../core/types/assetDiscovery.js";
import { toEVMInteropAddress } from "../../core/utils/addressHelpers.js";

export const ACROSS_ORDER_DATA_TYPE =
    "0x9df4b782e7bbc178b3b93bfe8aafb909e84e39484d7f3c59f400f1b4691f85e2";

/**
 * Across Origin Settler contract addresses (ERC-7683 IOriginSettler implementation)
 * These contracts are used to create cross-chain intents
 * Supports both mainnet and testnet deployments
 * @see https://docs.across.to/developer-quickstart/erc-7683-in-production
 */
export const ACROSS_ORIGIN_SETTLER_ADDRESSES: Record<number, Hex> = {
    // Mainnet addresses
    [base.id]: getAddress("0x4afb570AC68BfFc26Bb02FdA3D801728B0f93C9E"),
    [arbitrum.id]: getAddress("0xB0B07055F214Ce59ccB968663d3435B9f3294998"),
    // Testnet addresses
    [sepolia.id]: getAddress("0x73f70aabdad84cc5d6f58c85e655eaf1edeb9184"),
    [baseSepolia.id]: getAddress("0x0e767d39c878ac33296ac1c71f8d8631c6d2ecfb"),
    [arbitrumSepolia.id]: getAddress("0x2158c256b2d9b2b58d90d3dda1b6a90d64498f7d"),
} as const;

/**
 * Across API URLs for different networks
 * @internal - Used by AcrossProvider, not meant for external use
 */
const ACROSS_API_URLS = {
    mainnet: "https://app.across.to/api",
    testnet: "https://testnet.across.to/api",
} as const;

/**
 * Get Across API URL based on network configuration
 * @internal - Used by AcrossProvider, not meant for external use
 * @param isTestnet - Whether to use testnet (defaults to false for mainnet)
 * @returns The appropriate API URL
 */
function getAcrossApiUrl(isTestnet: boolean = false): string {
    return isTestnet ? ACROSS_API_URLS.testnet : ACROSS_API_URLS.mainnet;
}

// Export only for internal use within the package
export { getAcrossApiUrl };

// Gas limit for the open transaction
// Obtained from previous transactions
export const ACROSS_OPEN_GAS_LIMIT = 2600_00n;

/**
 * Across SpokePool contract addresses on each chain
 * Used for watching fill events on destination chains
 *
 * Supports both mainnet and testnet addresses
 * @see https://docs.across.to/reference/contract-addresses/
 */
export const ACROSS_SPOKE_POOL_ADDRESSES: Record<number, Hex> = {
    // Mainnet addresses
    [base.id]: getAddress("0x09aea4b2242abC8bb4BB78D537A67a245A7bEC64"),
    [arbitrum.id]: getAddress("0xe35e9842fceaca96570b734083f4a58e8f7c5f2a"),
    // Testnet addresses
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

/**
 * Event signature for V3FundsDeposited event
 */
export const ACROSS_V3_FUNDS_DEPOSITED_SIGNATURE =
    "0x32ed1a409ef04c7b0227189c3a103dc5ac10e775a15b785dcc510201f7c25ad3" as const;

/**
 * SpokePool.deposit function ABI (V3 with bytes32 for multi-chain support)
 * Selector: 0xad5425c6
 *
 * @see https://etherscan.io/address/0x5c7BCd6E7De5423a257D81B442095A1a6ced35C5#code (Mainnet SpokePool)
 */
export const ACROSS_SPOKE_POOL_DEPOSIT_ABI = [
    {
        inputs: [
            { internalType: "bytes32", name: "depositor", type: "bytes32" },
            { internalType: "bytes32", name: "recipient", type: "bytes32" },
            { internalType: "bytes32", name: "inputToken", type: "bytes32" },
            { internalType: "bytes32", name: "outputToken", type: "bytes32" },
            { internalType: "uint256", name: "inputAmount", type: "uint256" },
            { internalType: "uint256", name: "outputAmount", type: "uint256" },
            { internalType: "uint256", name: "destinationChainId", type: "uint256" },
            { internalType: "bytes32", name: "exclusiveRelayer", type: "bytes32" },
            { internalType: "uint32", name: "quoteTimestamp", type: "uint32" },
            { internalType: "uint32", name: "fillDeadline", type: "uint32" },
            { internalType: "uint32", name: "exclusivityParameter", type: "uint32" },
            { internalType: "bytes", name: "message", type: "bytes" },
        ],
        name: "deposit",
        outputs: [],
        stateMutability: "payable",
        type: "function",
    },
] as const;

/**
 * Chain IDs returned by Across API that are not supported by this SDK
 * These non-EVM chains are filtered out during asset discovery
 */
export const ACROSS_UNSUPPORTED_CHAIN_IDS: ReadonlySet<number> = new Set([
    34268394551451, // Solana mainnet
]);

/**
 * Hardcoded testnet tokens for Across.
 * The Across testnet API (/swap/tokens) returns mainnet chain IDs,
 * so we use a static list until that's fixed.
 */
export const ACROSS_TESTNET_TOKENS: NetworkAssets[] = [
    {
        chainId: 11155111, // Sepolia
        assets: [
            {
                address: toEVMInteropAddress(
                    11155111,
                    "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
                ),
                symbol: "WETH",
                decimals: 18,
            },
            {
                address: toEVMInteropAddress(
                    11155111,
                    "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
                ),
                symbol: "USDC",
                decimals: 6,
            },
        ],
    },
    {
        chainId: 84532, // Base Sepolia
        assets: [
            {
                address: toEVMInteropAddress(84532, "0x4200000000000000000000000000000000000006"),
                symbol: "WETH",
                decimals: 18,
            },
            {
                address: toEVMInteropAddress(84532, "0x036CbD53842c5426634e7929541eC2318f3dCF7e"),
                symbol: "USDC",
                decimals: 6,
            },
        ],
    },
    {
        chainId: 421614, // Arbitrum Sepolia
        assets: [
            {
                address: toEVMInteropAddress(421614, "0x980B62Da83eFf3D4576C647993b0c1D7faf17c73"),
                symbol: "WETH",
                decimals: 18,
            },
            {
                address: toEVMInteropAddress(421614, "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"),
                symbol: "USDC",
                decimals: 6,
            },
        ],
    },
];
