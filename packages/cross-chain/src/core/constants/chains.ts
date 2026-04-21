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
 * Curated set of chains historically shipped by this SDK.
 *
 * Consumers may use it as a convenient default for UI chain pickers, but it
 * is **not** the authoritative list of bridging-capable chains — that is
 * derived from the registered providers' asset discovery services at
 * runtime. Generic chain-registry lookups (e.g. `getChainById`) accept any
 * chain known to viem.
 */
export const SUPPORTED_CHAINS = [...MAINNET_CHAINS, ...TESTNET_CHAINS] as const;
