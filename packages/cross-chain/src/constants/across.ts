import { getAddress, Hex } from "viem";
import { arbitrumSepolia, baseSepolia, sepolia } from "viem/chains";

export const ACROSS_DEPOSIT_ABI = [
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
            { type: "uint32", name: "exclusivityPeriod" },
            { type: "bytes", name: "message" },
        ],
    },
];

export const ACROSS_ORDER_DATA_TYPE =
    "0x9df4b782e7bbc178b3b93bfe8aafb909e84e39484d7f3c59f400f1b4691f85e2";

export const ACROSS_SETTLER_CONTRACT_ADDRESSES: Record<number, Hex> = {
    [sepolia.id]: getAddress("0x73f70aabdad84cc5d6f58c85e655eaf1edeb9184"),
    [baseSepolia.id]: getAddress("0x0e767d39c878ac33296ac1c71f8d8631c6d2ecfb"),
    [arbitrumSepolia.id]: getAddress("0x2158c256b2d9b2b58d90d3dda1b6a90d64498f7d"),
} as const;

export const ACROSS_TESTING_API_URL = "https://testnet.across.to/api";
