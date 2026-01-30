import {
    arbitrum,
    arbitrumSepolia,
    base,
    baseSepolia,
    optimism,
    optimismSepolia,
    sepolia,
} from "viem/chains";

/**
 * Token metadata interface
 */
export interface TokenInfo {
    symbol: string;
    decimals: number;
    /** Whether this token can be minted freely (for testing) */
    mintable?: boolean;
}

/**
 * Mainnet supported tokens by chain ID
 */
export const MAINNET_SUPPORTED_TOKEN_BY_CHAIN_ID = {
    [base.id]: [
        "0x4200000000000000000000000000000000000006", // WETH
        "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC (native)
        "0xc0b782920b2de8b55f08fc98004eb5c7d4fbf287", // OIF Mock USDC (mintable)
    ],
    [arbitrum.id]: [
        "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
        "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // USDC (native)
        "0x7e13e59a15e4703a54a0976ddd970f8fe52d3a76", // OIF Mock USDC (mintable)
    ],
    [optimism.id]: [
        "0x4200000000000000000000000000000000000006", // WETH
        "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", // USDC (native)
        "0xc0b782920b2de8b55f08fc98004eb5c7d4fbf287", // OIF Mock USDC (mintable)
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
        "0x73c83dacc74bb8a704717ac09703b959e74b9705", // OIF Mock USDC (mintable)
    ],
    [arbitrumSepolia.id]: [
        "0x980B62Da83eFf3D4576C647993b0c1D7faf17c73", // WETH
        "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d", // USDC
    ],
    [optimismSepolia.id]: [
        "0x4200000000000000000000000000000000000006", // WETH
        "0x191688b2ff5be8f0a5bcab3e819c900a810faaf6", // OIF Mock USDC (mintable)
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
        "0xc0b782920b2de8b55f08fc98004eb5c7d4fbf287": {
            symbol: "oifUSDC",
            decimals: 6,
            mintable: true,
        },
    },
    [arbitrum.id]: {
        "0xaf88d065e77c8cC2239327C5EDb3A432268e5831": { symbol: "USDC", decimals: 6 },
        "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1": { symbol: "WETH", decimals: 18 },
        "0x7e13e59a15e4703a54a0976ddd970f8fe52d3a76": {
            symbol: "oifUSDC",
            decimals: 6,
            mintable: true,
        },
    },
    [optimism.id]: {
        "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85": { symbol: "USDC", decimals: 6 },
        "0x4200000000000000000000000000000000000006": { symbol: "WETH", decimals: 18 },
        "0xc0b782920b2de8b55f08fc98004eb5c7d4fbf287": {
            symbol: "oifUSDC",
            decimals: 6,
            mintable: true,
        },
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
        "0x73c83dacc74bb8a704717ac09703b959e74b9705": {
            symbol: "oifUSDC",
            decimals: 6,
            mintable: true,
        },
    },
    [arbitrumSepolia.id]: {
        "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d": { symbol: "USDC", decimals: 6 },
        "0x980B62Da83eFf3D4576C647993b0c1D7faf17c73": { symbol: "WETH", decimals: 18 },
    },
    [optimismSepolia.id]: {
        "0x4200000000000000000000000000000000000006": { symbol: "WETH", decimals: 18 },
        "0x191688b2ff5be8f0a5bcab3e819c900a810faaf6": {
            symbol: "oifUSDC",
            decimals: 6,
            mintable: true,
        },
    },
};
