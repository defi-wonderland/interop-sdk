import type { NetworkAssets } from "../../core/types/assetDiscovery.js";

/** Relay API base URLs for mainnet and testnet. */
const RELAY_API_URLS = {
    mainnet: "https://api.relay.link",
    testnet: "https://api.testnets.relay.link",
} as const;

/** Returns the Relay API base URL for the given network environment. */
export function getRelayApiUrl(isTestnet: boolean = false): string {
    return isTestnet ? RELAY_API_URLS.testnet : RELAY_API_URLS.mainnet;
}

/**
 * Hardcoded testnet tokens for Relay.
 *
 * Data sourced from `https://api.testnets.relay.link/chains` (EVM chains
 * only, `supportsBridging: true` tokens).
 */
export const RELAY_TESTNET_TOKENS: NetworkAssets[] = [
    {
        chainId: 11155111, // Sepolia
        assets: [
            {
                address: "0x0000000000000000000000000000000000000000",
                symbol: "ETH",
                decimals: 18,
            },
            {
                address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
                symbol: "USDC",
                decimals: 6,
            },
        ],
    },
    {
        chainId: 84532, // Base Sepolia
        assets: [
            {
                address: "0x0000000000000000000000000000000000000000",
                symbol: "ETH",
                decimals: 18,
            },
            {
                address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
                symbol: "USDC",
                decimals: 6,
            },
        ],
    },
];
