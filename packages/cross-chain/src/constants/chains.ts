import { arbitrum, arbitrumSepolia, base, baseSepolia, sepolia } from "viem/chains";

/**
 * Mainnet chains
 */
export const MAINNET_CHAINS = [base, arbitrum] as const;

/**
 * Testnet chains
 */
export const TESTNET_CHAINS = [sepolia, baseSepolia, arbitrumSepolia] as const;

/**
 * Supported chains for cross-chain operations
 * Includes both mainnet and testnet networks
 */
export const SUPPORTED_CHAINS = [...MAINNET_CHAINS, ...TESTNET_CHAINS] as const;
