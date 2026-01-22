import { arbitrum, arbitrumSepolia, base, baseSepolia, sepolia, type Chain } from 'viem/chains';

/**
 * Chain configuration interface - single source of truth for each chain
 */
export interface ChainConfig {
  /** The viem chain object */
  chain: Chain;
  /** Display name */
  name: string;
  /** Short name for URLs/identifiers */
  shortName: string;
  /** Public RPC URL */
  rpcUrl: string;
  /** Block explorer info */
  blockExplorer: {
    name: string;
    url: string;
  };
}

/**
 * Mainnet chain configs - single source of truth
 */
export const MAINNET_CHAIN_CONFIGS: ChainConfig[] = [
  {
    chain: base,
    name: 'Base',
    shortName: 'base',
    rpcUrl: 'https://base-rpc.publicnode.com',
    blockExplorer: { name: 'Basescan', url: 'https://basescan.org' },
  },
  {
    chain: arbitrum,
    name: 'Arbitrum One',
    shortName: 'arbitrum',
    rpcUrl: 'https://arbitrum-one-rpc.publicnode.com',
    blockExplorer: { name: 'Arbiscan', url: 'https://arbiscan.io' },
  },
];

/**
 * Testnet chain configs - single source of truth
 */
export const TESTNET_CHAIN_CONFIGS: ChainConfig[] = [
  {
    chain: sepolia,
    name: 'Ethereum Sepolia',
    shortName: 'sepolia',
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    blockExplorer: { name: 'Etherscan', url: 'https://sepolia.etherscan.io' },
  },
  {
    chain: baseSepolia,
    name: 'Base Sepolia',
    shortName: 'base-sepolia',
    rpcUrl: 'https://base-sepolia-rpc.publicnode.com',
    blockExplorer: { name: 'Basescan', url: 'https://sepolia.basescan.org' },
  },
  {
    chain: arbitrumSepolia,
    name: 'Arbitrum Sepolia',
    shortName: 'arbitrum-sepolia',
    rpcUrl: 'https://api.zan.top/arb-sepolia',
    blockExplorer: { name: 'Arbiscan', url: 'https://sepolia.arbiscan.io' },
  },
];

/**
 * All chain configs
 */
export const ALL_CHAIN_CONFIGS = [...MAINNET_CHAIN_CONFIGS, ...TESTNET_CHAIN_CONFIGS];

/**
 * Extract chains from configs
 */
function extractChains<T extends ChainConfig[]>(configs: T): Chain[] {
  return configs.map((c) => c.chain);
}

/**
 * Extract RPC URLs from chain configs
 */
function extractRpcUrls(configs: ChainConfig[]): Record<number, string> {
  return Object.fromEntries(configs.map((c) => [c.chain.id, c.rpcUrl]));
}

/** Mainnet chains */
export const MAINNET_CHAINS = extractChains(MAINNET_CHAIN_CONFIGS) as [Chain, ...Chain[]];

/** Testnet chains */
export const TESTNET_CHAINS = extractChains(TESTNET_CHAIN_CONFIGS) as [Chain, ...Chain[]];

/** All chains */
export const ALL_CHAINS = extractChains(ALL_CHAIN_CONFIGS);

/** Mainnet RPC URLs */
export const MAINNET_RPC_URLS = extractRpcUrls(MAINNET_CHAIN_CONFIGS);

/** Testnet RPC URLs */
export const TESTNET_RPC_URLS = extractRpcUrls(TESTNET_CHAIN_CONFIGS);

/** All RPC URLs */
export const ALL_RPC_URLS = extractRpcUrls(ALL_CHAIN_CONFIGS);
