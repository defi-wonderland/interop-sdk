import type { NetworkAssets } from "../../core/types/assetDiscovery.js";

export const LIFI_INTENTS_ORDER_SERVER_URL = "https://order.li.fi";
export const LIFI_INTENTS_ORDER_SERVER_DEV_URL = "https://order-dev.li.fi";

/**
 * Hardcoded supported tokens for LI.FI Intents.
 *
 * The `/routes` endpoint advertises routes that the quote API cannot fulfill,
 * so we use a static list based on the documented scope:
 * https://docs.li.fi/lifi-intents/introduction#current-scope-%26-support
 *
 * Note: Native ETH (0x000...000) is only supported as an output token, not as input.
 */
export const LIFI_INTENTS_SUPPORTED_TOKENS: NetworkAssets[] = [
    {
        chainId: 1, // Ethereum
        assets: [
            { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", symbol: "USDC", decimals: 6 },
            { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", symbol: "USDT", decimals: 6 },
            {
                address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
                symbol: "WETH",
                decimals: 18,
            },
        ],
    },
    {
        chainId: 8453, // Base
        assets: [
            { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", symbol: "USDC", decimals: 6 },
            { address: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2", symbol: "USDT", decimals: 6 },
            {
                address: "0x4200000000000000000000000000000000000006",
                symbol: "WETH",
                decimals: 18,
            },
        ],
    },
    {
        chainId: 42161, // Arbitrum
        assets: [
            { address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", symbol: "USDC", decimals: 6 },
            { address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", symbol: "USDT", decimals: 6 },
            {
                address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
                symbol: "WETH",
                decimals: 18,
            },
        ],
    },
];
