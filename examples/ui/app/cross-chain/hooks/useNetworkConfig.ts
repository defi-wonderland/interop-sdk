import { useMemo } from 'react';
import {
  MAINNET_SUPPORTED_TOKEN_BY_CHAIN_ID,
  TESTNET_SUPPORTED_TOKEN_BY_CHAIN_ID,
  MAINNET_TOKEN_INFO,
  TESTNET_TOKEN_INFO,
  type TokenInfo,
} from '@wonderland/interop-cross-chain';
import { base, arbitrum, sepolia, baseSepolia } from 'viem/chains';
import { useIsTestnet } from '../config/NetworkContext';
import {
  MAINNET_CHAIN_CONFIGS,
  MAINNET_RPC_URLS,
  TESTNET_CHAIN_CONFIGS,
  TESTNET_RPC_URLS,
  type ChainConfig,
} from '../constants/chains';

/**
 * Hook to get network-specific token configuration
 */
export function useTokenConfig() {
  const isTestnet = useIsTestnet();
  return useMemo(
    () => ({
      SUPPORTED_TOKEN_BY_CHAIN_ID: (isTestnet
        ? TESTNET_SUPPORTED_TOKEN_BY_CHAIN_ID
        : MAINNET_SUPPORTED_TOKEN_BY_CHAIN_ID) as Record<number, readonly string[]>,
      TOKEN_INFO: (isTestnet ? TESTNET_TOKEN_INFO : MAINNET_TOKEN_INFO) as Record<number, Record<string, TokenInfo>>,
    }),
    [isTestnet],
  );
}

/**
 * Hook to get network-specific chain configuration
 */
export function useChainConfig() {
  const isTestnet = useIsTestnet();
  return useMemo(() => {
    const SUPPORTED_CHAINS = isTestnet ? TESTNET_CHAIN_CONFIGS : MAINNET_CHAIN_CONFIGS;
    const DEFAULT_INPUT_CHAIN_ID = isTestnet ? sepolia.id : base.id;
    const DEFAULT_OUTPUT_CHAIN_ID = isTestnet ? baseSepolia.id : arbitrum.id;

    const getChainConfig = (chainId?: number): ChainConfig | undefined => {
      if (!chainId) return undefined;
      return SUPPORTED_CHAINS.find((c) => c.chain.id === chainId);
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
  }, [isTestnet]);
}

/**
 * Hook to get network-specific RPC URLs
 */
export function useRpcUrls() {
  const isTestnet = useIsTestnet();
  return useMemo(() => {
    return isTestnet ? TESTNET_RPC_URLS : MAINNET_RPC_URLS;
  }, [isTestnet]);
}
