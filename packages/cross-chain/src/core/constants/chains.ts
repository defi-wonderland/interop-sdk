import { arbitrum, arbitrumSepolia, base, baseSepolia, optimism, sepolia } from "viem/chains";

/**
 * Mainnet chains
 */
export const MAINNET_CHAINS = [base, arbitrum, optimism] as const;

/**
 * Testnet chains
 */
export const TESTNET_CHAINS = [sepolia, baseSepolia, arbitrumSepolia] as const;

/**
 * Default chain list, handy for UI pickers or tests.
 *
 * It does not define which chains the SDK can bridge through. Bridging
 * support comes from the registered providers at runtime, and generic
 * chain lookups resolve against viem's full catalogue.
 */
export const SUPPORTED_CHAINS = [...MAINNET_CHAINS, ...TESTNET_CHAINS] as const;
