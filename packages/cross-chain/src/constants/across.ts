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

/**
 * V3FundsDeposited event ABI for Across V3
 * Emitted when a user deposits funds to initiate a cross-chain transfer
 */
export const ACROSS_V3_FUNDS_DEPOSITED_ABI = [
    {
        anonymous: false,
        type: "event",
        name: "V3FundsDeposited",
        inputs: [
            { indexed: false, internalType: "address", name: "inputToken", type: "address" },
            { indexed: false, internalType: "address", name: "outputToken", type: "address" },
            { indexed: false, internalType: "uint256", name: "inputAmount", type: "uint256" },
            { indexed: false, internalType: "uint256", name: "outputAmount", type: "uint256" },
            { indexed: true, internalType: "uint256", name: "destinationChainId", type: "uint256" },
            { indexed: true, internalType: "uint32", name: "depositId", type: "uint32" },
            { indexed: false, internalType: "uint32", name: "quoteTimestamp", type: "uint32" },
            { indexed: false, internalType: "uint32", name: "fillDeadline", type: "uint32" },
            { indexed: false, internalType: "uint32", name: "exclusivityDeadline", type: "uint32" },
            { indexed: true, internalType: "address", name: "depositor", type: "address" },
            { indexed: false, internalType: "address", name: "recipient", type: "address" },
            { indexed: false, internalType: "address", name: "exclusiveRelayer", type: "address" },
            { indexed: false, internalType: "bytes", name: "message", type: "bytes" },
        ],
    },
] as const;

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
 * SpokePoolPeriphery.swapAndBridge function ABI
 * Selector: 0x110560ad
 *
 * @see https://etherscan.io/address/0x89415a82d909a7238d69094C3Dd1dCC1aCbDa85C#code (Mainnet SpokePoolPeriphery)
 */
export const ACROSS_SPOKE_POOL_PERIPHERY_SWAP_AND_BRIDGE_ABI = [
    {
        inputs: [
            {
                components: [
                    {
                        components: [
                            { internalType: "uint256", name: "amount", type: "uint256" },
                            { internalType: "address", name: "recipient", type: "address" },
                        ],
                        internalType: "struct SpokePoolPeripheryInterface.Fees",
                        name: "submissionFees",
                        type: "tuple",
                    },
                    {
                        components: [
                            { internalType: "address", name: "inputToken", type: "address" },
                            { internalType: "bytes32", name: "outputToken", type: "bytes32" },
                            { internalType: "uint256", name: "outputAmount", type: "uint256" },
                            { internalType: "address", name: "depositor", type: "address" },
                            { internalType: "bytes32", name: "recipient", type: "bytes32" },
                            {
                                internalType: "uint256",
                                name: "destinationChainId",
                                type: "uint256",
                            },
                            { internalType: "bytes32", name: "exclusiveRelayer", type: "bytes32" },
                            { internalType: "uint32", name: "quoteTimestamp", type: "uint32" },
                            { internalType: "uint32", name: "fillDeadline", type: "uint32" },
                            {
                                internalType: "uint32",
                                name: "exclusivityParameter",
                                type: "uint32",
                            },
                            { internalType: "bytes", name: "message", type: "bytes" },
                        ],
                        internalType: "struct SpokePoolPeripheryInterface.BaseDepositData",
                        name: "depositData",
                        type: "tuple",
                    },
                    { internalType: "address", name: "swapToken", type: "address" },
                    { internalType: "address", name: "exchange", type: "address" },
                    {
                        internalType: "enum SpokePoolPeripheryInterface.TransferType",
                        name: "transferType",
                        type: "uint8",
                    },
                    { internalType: "uint256", name: "swapTokenAmount", type: "uint256" },
                    {
                        internalType: "uint256",
                        name: "minExpectedInputTokenAmount",
                        type: "uint256",
                    },
                    { internalType: "bytes", name: "routerCalldata", type: "bytes" },
                    { internalType: "bool", name: "enableProportionalAdjustment", type: "bool" },
                    { internalType: "address", name: "spokePool", type: "address" },
                    { internalType: "uint256", name: "nonce", type: "uint256" },
                ],
                internalType: "struct SpokePoolPeripheryInterface.SwapAndDepositData",
                name: "swapAndDepositData",
                type: "tuple",
            },
        ],
        name: "swapAndBridge",
        outputs: [],
        stateMutability: "payable",
        type: "function",
    },
] as const;

/**
 * MulticallHandler.Instructions struct ABI for decoding message bytes
 * Used to extract the actual recipient from swapAndBridge messages
 *
 * The message in swapAndBridge contains encoded Instructions that specify
 * what to do with the bridged tokens on the destination chain.
 *
 * @see https://github.com/across-protocol/contracts/blob/master/contracts/handlers/MulticallHandler.sol
 * @see https://optimistic.etherscan.io/address/0x0f7AE28dE1C8532170AD4EE566b5801485C13A0E#code (Optimism MulticallHandler)
 */
export const ACROSS_MULTICALL_HANDLER_INSTRUCTIONS_ABI = [
    {
        type: "tuple",
        components: [
            {
                type: "tuple[]",
                name: "calls",
                components: [
                    { type: "address", name: "target" },
                    { type: "bytes", name: "callData" },
                    { type: "uint256", name: "value" },
                ],
            },
            { type: "address", name: "fallbackRecipient" },
        ],
    },
] as const;

/**
 * MulticallHandler.drainLeftoverTokens function ABI
 * Selector: 0xef8738d3
 *
 * Called on destination chain to transfer bridged tokens to the final recipient.
 * The Across API includes these calls in the message to route tokens to the user.
 *
 * @see https://github.com/across-protocol/contracts/blob/master/contracts/handlers/MulticallHandler.sol
 */
export const ACROSS_DRAIN_LEFTOVER_TOKENS_ABI = [
    {
        type: "function",
        name: "drainLeftoverTokens",
        inputs: [
            { type: "address", name: "token" },
            { type: "address", name: "destination" },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
] as const;
