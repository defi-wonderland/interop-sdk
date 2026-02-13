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
  overrideRpc(sepolia, 'https://ethereum-sepolia-rpc.publicnode.com'),
  overrideRpc(baseSepolia, 'https://base-sepolia-rpc.publicnode.com'),
  overrideRpc(arbitrumSepolia, 'https://api.zan.top/arb-sepolia'),
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
