import type { Chain } from "viem/chains";

import { PROVIDER_CONFIG, PROVIDERS } from "./providers.js";

const acrossChains = PROVIDER_CONFIG[PROVIDERS.ACROSS].chains;
const oifChains = PROVIDER_CONFIG[PROVIDERS.OIF].chains;

const allMainnetChains: Chain[] = [...acrossChains.mainnet, ...oifChains.mainnet];
const allTestnetChains: Chain[] = [...acrossChains.testnet, ...oifChains.testnet];

/**
 * Mainnet chains
 */
export const MAINNET_CHAINS = [...new Set(allMainnetChains)];

/**
 * Testnet chains
 */
export const TESTNET_CHAINS = [...new Set(allTestnetChains)];

/**
 * Supported chains for cross-chain operations
 */
export const SUPPORTED_CHAINS = [...MAINNET_CHAINS, ...TESTNET_CHAINS];
