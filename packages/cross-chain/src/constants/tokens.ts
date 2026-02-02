import {
    arbitrum,
    arbitrumSepolia,
    base,
    baseSepolia,
    optimism,
    optimismSepolia,
    sepolia,
} from "viem/chains";

import { TOKEN_ADDRESSES } from "./addresses.js";
import { PROVIDER_CONFIG } from "./providers.js";

/**
 * Token metadata interface
 */
export interface TokenInfo {
    symbol: string;
    decimals: number;
}

function getAllTokensForChain(chainId: number): string[] {
    const tokens = Object.values(PROVIDER_CONFIG).reduce<Record<string, true>>((acc, config) => {
        const chainKey = chainId as keyof typeof config.tokens;
        const chainTokens = config.tokens[chainKey] as readonly string[] | undefined;
        if (chainTokens) {
            chainTokens.forEach((token) => (acc[token] = true));
        }
        return acc;
    }, {});
    return Object.keys(tokens);
}

/**
 * Mainnet supported tokens by chain ID
 */
export const MAINNET_SUPPORTED_TOKEN_BY_CHAIN_ID = {
    [base.id]: getAllTokensForChain(base.id),
    [arbitrum.id]: getAllTokensForChain(arbitrum.id),
    [optimism.id]: getAllTokensForChain(optimism.id),
} as const;

/**
 * Testnet supported tokens by chain ID
 */
export const TESTNET_SUPPORTED_TOKEN_BY_CHAIN_ID = {
    [sepolia.id]: getAllTokensForChain(sepolia.id),
    [baseSepolia.id]: getAllTokensForChain(baseSepolia.id),
    [arbitrumSepolia.id]: getAllTokensForChain(arbitrumSepolia.id),
    [optimismSepolia.id]: getAllTokensForChain(optimismSepolia.id),
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
        [TOKEN_ADDRESSES.base.USDC]: { symbol: "USDC", decimals: 6 },
        [TOKEN_ADDRESSES.base.WETH]: { symbol: "WETH", decimals: 18 },
        [TOKEN_ADDRESSES.base.OIF_USDC]: { symbol: "mockUSDC", decimals: 6 },
    },
    [arbitrum.id]: {
        [TOKEN_ADDRESSES.arbitrum.USDC]: { symbol: "USDC", decimals: 6 },
        [TOKEN_ADDRESSES.arbitrum.WETH]: { symbol: "WETH", decimals: 18 },
        [TOKEN_ADDRESSES.arbitrum.OIF_USDC]: { symbol: "mockUSDC", decimals: 6 },
    },
    [optimism.id]: {
        [TOKEN_ADDRESSES.optimism.USDC]: { symbol: "USDC", decimals: 6 },
        [TOKEN_ADDRESSES.optimism.WETH]: { symbol: "WETH", decimals: 18 },
        [TOKEN_ADDRESSES.optimism.OIF_USDC]: { symbol: "mockUSDC", decimals: 6 },
    },
};

/**
 * Testnet token information (symbol, decimals) by chain ID and token address
 */
export const TESTNET_TOKEN_INFO: Record<number, Record<string, TokenInfo>> = {
    [sepolia.id]: {
        [TOKEN_ADDRESSES.sepolia.USDC]: { symbol: "USDC", decimals: 6 },
        [TOKEN_ADDRESSES.sepolia.WETH]: { symbol: "WETH", decimals: 18 },
    },
    [baseSepolia.id]: {
        [TOKEN_ADDRESSES.baseSepolia.USDC]: { symbol: "USDC", decimals: 6 },
        [TOKEN_ADDRESSES.baseSepolia.WETH]: { symbol: "WETH", decimals: 18 },
        [TOKEN_ADDRESSES.baseSepolia.OIF_USDC]: { symbol: "mockUSDC", decimals: 6 },
    },
    [arbitrumSepolia.id]: {
        [TOKEN_ADDRESSES.arbitrumSepolia.USDC]: { symbol: "USDC", decimals: 6 },
        [TOKEN_ADDRESSES.arbitrumSepolia.WETH]: { symbol: "WETH", decimals: 18 },
    },
    [optimismSepolia.id]: {
        [TOKEN_ADDRESSES.optimismSepolia.WETH]: { symbol: "WETH", decimals: 18 },
        [TOKEN_ADDRESSES.optimismSepolia.OIF_USDC]: { symbol: "mockUSDC", decimals: 6 },
    },
};

/**
 * Token information by chain ID and token address
 */
export const TOKEN_INFO: Record<number, Record<string, TokenInfo>> = {
    ...MAINNET_TOKEN_INFO,
    ...TESTNET_TOKEN_INFO,
};
