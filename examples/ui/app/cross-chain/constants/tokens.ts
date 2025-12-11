import { sepolia, baseSepolia, arbitrumSepolia } from 'viem/chains';

export const SUPPORTED_TOKEN_BY_CHAIN_ID: Record<number, readonly string[]> = {
  [sepolia.id]: ['0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14', '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'],
  [baseSepolia.id]: ['0x4200000000000000000000000000000000000006', '0x036CbD53842c5426634e7929541eC2318f3dCF7e'],
  [arbitrumSepolia.id]: ['0x980B62Da83eFf3D4576C647993b0c1D7faf17c73', '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d'],
} as const;

export const TOKEN_INFO: Record<string, { symbol: string; decimals: number }> = {
  '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14': { symbol: 'WETH', decimals: 18 },
  '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238': { symbol: 'USDC', decimals: 6 },
  '0x4200000000000000000000000000000000000006': { symbol: 'WETH', decimals: 18 },
  '0x036CbD53842c5426634e7929541eC2318f3dCF7e': { symbol: 'USDC', decimals: 6 },
  '0x980B62Da83eFf3D4576C647993b0c1D7faf17c73': { symbol: 'WETH', decimals: 18 },
  '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d': { symbol: 'USDC', decimals: 6 },
};
