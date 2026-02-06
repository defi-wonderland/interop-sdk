import { arbitrum, arbitrumSepolia, base, baseSepolia, sepolia, type Chain } from 'viem/chains';

/**
 * Override chain default RPC, keeping original as fallback
 */
function overrideRpc(chain: Chain, rpcUrl: string): Chain {
  return {
    ...chain,
    rpcUrls: {
      ...chain.rpcUrls,
      default: { http: [rpcUrl, ...chain.rpcUrls.default.http] },
    },
  };
}

/**
 * Default RPC URLs (used in production)
 */
const DEFAULT_TESTNET_RPCS = {
  sepolia: 'https://ethereum-sepolia-rpc.publicnode.com',
  baseSepolia: 'https://base-sepolia-rpc.publicnode.com',
  arbitrumSepolia: 'https://api.zan.top/arb-sepolia',
} as const;

const isE2E = process.env.NEXT_PUBLIC_E2E === 'true';

/**
 * Get testnet RPC URL, allowing override via environment variables in E2E mode only
 */
function getTestnetRpc(chain: keyof typeof DEFAULT_TESTNET_RPCS): string {
  if (!isE2E) {
    return DEFAULT_TESTNET_RPCS[chain];
  }

  const envMap = {
    sepolia: process.env.NEXT_PUBLIC_RPC_SEPOLIA,
    baseSepolia: process.env.NEXT_PUBLIC_RPC_BASE_SEPOLIA,
    arbitrumSepolia: process.env.NEXT_PUBLIC_RPC_ARBITRUM_SEPOLIA,
  };
  return envMap[chain] || DEFAULT_TESTNET_RPCS[chain];
}

/**
 * Mainnet chains
 */
export const MAINNET_CHAINS: readonly [Chain, ...Chain[]] = [
  overrideRpc(base, 'https://base-rpc.publicnode.com'),
  overrideRpc(arbitrum, 'https://arbitrum-one-rpc.publicnode.com'),
];

/**
 * Testnet chains
 */
export const TESTNET_CHAINS: readonly [Chain, ...Chain[]] = [
  overrideRpc(sepolia, getTestnetRpc('sepolia')),
  overrideRpc(baseSepolia, getTestnetRpc('baseSepolia')),
  overrideRpc(arbitrumSepolia, getTestnetRpc('arbitrumSepolia')),
];

/**
 * All chains
 */
export const ALL_CHAINS: readonly Chain[] = [...MAINNET_CHAINS, ...TESTNET_CHAINS];

/**
 * Extract RPC URLs from chains (for SDK/tracker usage)
 */
export const MAINNET_RPC_URLS: Record<number, string> = Object.fromEntries(
  MAINNET_CHAINS.map((c) => [c.id, c.rpcUrls.default.http[0]]),
);

export const TESTNET_RPC_URLS: Record<number, string> = Object.fromEntries(
  TESTNET_CHAINS.map((c) => [c.id, c.rpcUrls.default.http[0]]),
);

export const ALL_RPC_URLS: Record<number, string> = { ...MAINNET_RPC_URLS, ...TESTNET_RPC_URLS };
