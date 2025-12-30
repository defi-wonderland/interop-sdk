import { sepolia, baseSepolia, arbitrumSepolia } from 'viem/chains';

/**
 * Public RPC URLs for intent tracking (read-only operations)
 */
export const RPC_URLS: Record<number, string> = {
  [sepolia.id]: 'https://ethereum-sepolia-rpc.publicnode.com',
  [baseSepolia.id]: 'https://base-sepolia-rpc.publicnode.com',
  [arbitrumSepolia.id]: 'https://api.zan.top/arb-sepolia',
};
