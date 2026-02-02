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

export const PROVIDERS = {
    ACROSS: "across",
    OIF: "oif",
} as const;

export type Provider = (typeof PROVIDERS)[keyof typeof PROVIDERS];

/**
 * Provider configuration - chains and tokens supported by each provider
 */
export const PROVIDER_CONFIG = {
    [PROVIDERS.ACROSS]: {
        chains: {
            mainnet: [base, arbitrum, optimism],
            testnet: [sepolia, baseSepolia, arbitrumSepolia],
        },
        tokens: {
            [base.id]: [TOKEN_ADDRESSES.base.USDC, TOKEN_ADDRESSES.base.WETH],
            [arbitrum.id]: [TOKEN_ADDRESSES.arbitrum.USDC, TOKEN_ADDRESSES.arbitrum.WETH],
            [optimism.id]: [TOKEN_ADDRESSES.optimism.USDC, TOKEN_ADDRESSES.optimism.WETH],
            [sepolia.id]: [TOKEN_ADDRESSES.sepolia.USDC, TOKEN_ADDRESSES.sepolia.WETH],
            [baseSepolia.id]: [TOKEN_ADDRESSES.baseSepolia.USDC, TOKEN_ADDRESSES.baseSepolia.WETH],
            [arbitrumSepolia.id]: [
                TOKEN_ADDRESSES.arbitrumSepolia.USDC,
                TOKEN_ADDRESSES.arbitrumSepolia.WETH,
            ],
        },
    },
    [PROVIDERS.OIF]: {
        chains: {
            mainnet: [base, arbitrum, optimism],
            testnet: [baseSepolia, optimismSepolia],
        },
        tokens: {
            [base.id]: [TOKEN_ADDRESSES.base.OIF_USDC],
            [arbitrum.id]: [TOKEN_ADDRESSES.arbitrum.OIF_USDC],
            [optimism.id]: [TOKEN_ADDRESSES.optimism.OIF_USDC],
            [baseSepolia.id]: [TOKEN_ADDRESSES.baseSepolia.OIF_USDC],
            [optimismSepolia.id]: [TOKEN_ADDRESSES.optimismSepolia.OIF_USDC],
        },
    },
} as const;

/**
 * Get the providers that support a specific token on a chain
 */
export function getProvidersForToken(chainId: number, tokenAddress: string): Provider[] {
    const providers = Object.entries(PROVIDER_CONFIG).reduce<Provider[]>(
        (acc, [provider, config]) => {
            const chainKey = chainId as keyof typeof config.tokens;
            const chainTokens = config.tokens[chainKey] as readonly string[] | undefined;
            if (chainTokens?.includes(tokenAddress)) {
                acc.push(provider as Provider);
            }
            return acc;
        },
        [],
    );
    return providers;
}
