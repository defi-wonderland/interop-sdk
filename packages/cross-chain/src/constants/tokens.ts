import { arbitrum, arbitrumSepolia, base, baseSepolia, sepolia } from "viem/chains";

/**
 * Token metadata interface
 */
export interface TokenInfo {
    symbol: string;
    decimals: number;
}

/**
 * Mainnet supported tokens by chain ID
 */
export const MAINNET_SUPPORTED_TOKEN_BY_CHAIN_ID = {
    [base.id]: [
        "0x4200000000000000000000000000000000000006", // WETH
        "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC (native)
    ],
    [arbitrum.id]: [
        "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
        "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // USDC (native)
    ],
} as const;

/**
 * Testnet supported tokens by chain ID
 */
export const TESTNET_SUPPORTED_TOKEN_BY_CHAIN_ID = {
    [sepolia.id]: [
        "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14", // WETH
        "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // USDC
    ],
    [baseSepolia.id]: [
        "0x4200000000000000000000000000000000000006", // WETH
        "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // USDC
    ],
    [arbitrumSepolia.id]: [
        "0x980B62Da83eFf3D4576C647993b0c1D7faf17c73", // WETH
        "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d", // USDC
    ],
} as const;

/**
 * Supported tokens by chain ID
 * Includes both mainnet and testnet token addresses
 */
export const SUPPORTED_TOKEN_BY_CHAIN_ID = {
    ...MAINNET_SUPPORTED_TOKEN_BY_CHAIN_ID,
    ...TESTNET_SUPPORTED_TOKEN_BY_CHAIN_ID,
} as const;

/**
 * Mainnet token information (symbol, decimals) by chain ID and token address
 */
export const MAINNET_TOKEN_INFO: Record<number, Record<string, TokenInfo>> = {
    [base.id]: {
        "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913": { symbol: "USDC", decimals: 6 },
        "0x4200000000000000000000000000000000000006": { symbol: "WETH", decimals: 18 },
    },
    [arbitrum.id]: {
        "0xaf88d065e77c8cC2239327C5EDb3A432268e5831": { symbol: "USDC", decimals: 6 },
        "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1": { symbol: "WETH", decimals: 18 },
    },
};

/**
 * Testnet token information (symbol, decimals) by chain ID and token address
 */
export const TESTNET_TOKEN_INFO: Record<number, Record<string, TokenInfo>> = {
    [sepolia.id]: {
        "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238": { symbol: "USDC", decimals: 6 },
        "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14": { symbol: "WETH", decimals: 18 },
    },
    [baseSepolia.id]: {
        "0x036CbD53842c5426634e7929541eC2318f3dCF7e": { symbol: "USDC", decimals: 6 },
        "0x4200000000000000000000000000000000000006": { symbol: "WETH", decimals: 18 },
    },
    [arbitrumSepolia.id]: {
        "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d": { symbol: "USDC", decimals: 6 },
        "0x980B62Da83eFf3D4576C647993b0c1D7faf17c73": { symbol: "WETH", decimals: 18 },
    },
};
