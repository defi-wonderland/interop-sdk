import { sepolia, baseSepolia, arbitrumSepolia } from 'viem/chains';

// Token addresses by chain
export const USDC_SEPOLIA = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as const;
export const WETH_SEPOLIA = '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14' as const;
export const USDC_BASE_SEPOLIA = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const;
export const WETH_BASE_SEPOLIA = '0x4200000000000000000000000000000000000006' as const;
export const USDC_ARBITRUM_SEPOLIA = '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d' as const;
export const WETH_ARBITRUM_SEPOLIA = '0x980B62Da83eFf3D4576C647993b0c1D7faf17c73' as const;

export const SUPPORTED_TOKEN_BY_CHAIN_ID: Record<number, readonly string[]> = {
  [sepolia.id]: [USDC_SEPOLIA, WETH_SEPOLIA],
  [baseSepolia.id]: [USDC_BASE_SEPOLIA, WETH_BASE_SEPOLIA],
  [arbitrumSepolia.id]: [USDC_ARBITRUM_SEPOLIA, WETH_ARBITRUM_SEPOLIA],
} as const;

export const TOKEN_INFO: Record<string, { symbol: string; decimals: number }> = {
  [USDC_SEPOLIA]: { symbol: 'USDC', decimals: 6 },
  [WETH_SEPOLIA]: { symbol: 'WETH', decimals: 18 },
  [USDC_BASE_SEPOLIA]: { symbol: 'USDC', decimals: 6 },
  [WETH_BASE_SEPOLIA]: { symbol: 'WETH', decimals: 18 },
  [USDC_ARBITRUM_SEPOLIA]: { symbol: 'USDC', decimals: 6 },
  [WETH_ARBITRUM_SEPOLIA]: { symbol: 'WETH', decimals: 18 },
};
