import { sepolia, baseSepolia, arbitrumSepolia } from 'viem/chains';

export const SUPPORTED_CHAINS = [
  { id: sepolia.id, name: 'Sepolia', shortName: 'sepolia' },
  { id: baseSepolia.id, name: 'Base Sepolia', shortName: 'base-sepolia' },
  { id: arbitrumSepolia.id, name: 'Arbitrum Sepolia', shortName: 'arbitrum-sepolia' },
] as const;

export const DEFAULT_INPUT_CHAIN_ID = sepolia.id;
export const DEFAULT_OUTPUT_CHAIN_ID = baseSepolia.id;
