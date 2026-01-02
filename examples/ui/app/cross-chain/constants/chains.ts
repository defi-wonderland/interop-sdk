import { sepolia, baseSepolia, arbitrumSepolia } from 'viem/chains';

export interface ChainConfig {
  id: number;
  name: string;
  shortName: string;
  blockExplorer: {
    name: string;
    url: string;
  };
}

export const SUPPORTED_CHAINS: ChainConfig[] = [
  {
    id: sepolia.id,
    name: 'Ethereum Sepolia',
    shortName: 'sepolia',
    blockExplorer: { name: 'Etherscan', url: 'https://sepolia.etherscan.io' },
  },
  {
    id: baseSepolia.id,
    name: 'Base Sepolia',
    shortName: 'base-sepolia',
    blockExplorer: { name: 'Basescan', url: 'https://sepolia.basescan.org' },
  },
  {
    id: arbitrumSepolia.id,
    name: 'Arbitrum Sepolia',
    shortName: 'arbitrum-sepolia',
    blockExplorer: { name: 'Arbiscan', url: 'https://sepolia.arbiscan.io' },
  },
];

export const DEFAULT_INPUT_CHAIN_ID = sepolia.id;
export const DEFAULT_OUTPUT_CHAIN_ID = baseSepolia.id;

/**
 * Get chain config by chain ID
 */
export function getChainConfig(chainId?: number): ChainConfig | undefined {
  if (!chainId) return undefined;
  return SUPPORTED_CHAINS.find((chain) => chain.id === chainId);
}

/**
 * Get block explorer transaction URL for a given chain
 */
export function getExplorerTxUrl(chainId?: number, txHash?: string): string | undefined {
  if (!chainId || !txHash) return undefined;
  const chain = getChainConfig(chainId);
  return chain ? `${chain.blockExplorer.url}/tx/${txHash}` : undefined;
}
