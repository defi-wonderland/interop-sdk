import { useMemo } from 'react';
import {
  MAINNET_SUPPORTED_TOKEN_BY_CHAIN_ID,
  TESTNET_SUPPORTED_TOKEN_BY_CHAIN_ID,
  MAINNET_TOKEN_INFO,
  TESTNET_TOKEN_INFO,
  type TokenInfo,
} from '@wonderland/interop-cross-chain';
import { arbitrum, arbitrumSepolia, base, baseSepolia, sepolia } from 'viem/chains';
import { IS_TESTNET } from '../config/network';
import type { ChainConfig } from '../constants/chains';

/**
 * Hook to get network-specific token configuration
 */
export function useTokenConfig() {
  return useMemo(
    () => ({
      SUPPORTED_TOKEN_BY_CHAIN_ID: (IS_TESTNET
        ? TESTNET_SUPPORTED_TOKEN_BY_CHAIN_ID
        : MAINNET_SUPPORTED_TOKEN_BY_CHAIN_ID) as Record<number, readonly string[]>,
      TOKEN_INFO: (IS_TESTNET ? TESTNET_TOKEN_INFO : MAINNET_TOKEN_INFO) as Record<number, Record<string, TokenInfo>>,
    }),
    [],
  );
}

const MAINNET_CHAINS: ChainConfig[] = [
  {
    id: base.id,
    name: 'Base',
    shortName: 'base',
    blockExplorer: { name: 'Basescan', url: 'https://basescan.org' },
  },
  {
    id: arbitrum.id,
    name: 'Arbitrum One',
    shortName: 'arbitrum',
    blockExplorer: { name: 'Arbiscan', url: 'https://arbiscan.io' },
  },
];

const TESTNET_CHAINS: ChainConfig[] = [
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

/**
 * Hook to get network-specific chain configuration
 */
export function useChainConfig() {
  return useMemo(() => {
    const SUPPORTED_CHAINS = IS_TESTNET ? TESTNET_CHAINS : MAINNET_CHAINS;
    const DEFAULT_INPUT_CHAIN_ID = IS_TESTNET ? sepolia.id : base.id;
    const DEFAULT_OUTPUT_CHAIN_ID = IS_TESTNET ? baseSepolia.id : arbitrum.id;

    const getChainConfig = (chainId?: number): ChainConfig | undefined => {
      if (!chainId) return undefined;
      return SUPPORTED_CHAINS.find((chain) => chain.id === chainId);
    };

    const getExplorerTxUrl = (chainId?: number, txHash?: string): string | undefined => {
      if (!chainId || !txHash) return undefined;
      const chain = getChainConfig(chainId);
      return chain ? `${chain.blockExplorer.url}/tx/${txHash}` : undefined;
    };

    return {
      SUPPORTED_CHAINS,
      DEFAULT_INPUT_CHAIN_ID,
      DEFAULT_OUTPUT_CHAIN_ID,
      getChainConfig,
      getExplorerTxUrl,
    };
  }, []);
}

/**
 * Hook to get network-specific RPC URLs
 */
export function useRpcUrls() {
  return useMemo(() => {
    const MAINNET_RPC_URLS: Record<number, string> = {
      [base.id]: 'https://base-rpc.publicnode.com',
      [arbitrum.id]: 'https://arbitrum-one-rpc.publicnode.com',
    };

    const TESTNET_RPC_URLS: Record<number, string> = {
      [sepolia.id]: 'https://ethereum-sepolia-rpc.publicnode.com',
      [baseSepolia.id]: 'https://base-sepolia-rpc.publicnode.com',
      [arbitrumSepolia.id]: 'https://api.zan.top/arb-sepolia',
    };

    return IS_TESTNET ? TESTNET_RPC_URLS : MAINNET_RPC_URLS;
  }, []);
}
