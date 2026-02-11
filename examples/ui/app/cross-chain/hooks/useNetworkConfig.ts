import { useMemo } from 'react';
import { base, arbitrum, sepolia, baseSepolia, type Chain } from 'viem/chains';
import { MAINNET_CHAINS, MAINNET_RPC_URLS, TESTNET_CHAINS, TESTNET_RPC_URLS } from '../constants/chains';
import { useIsTestnet, useDiscoveredAssetsSafe } from '../providers';
import type { UITokenInfo } from '../types/assets';

/**
 * Hook to get network-specific token configuration
 *
 * Returns discovered assets filtered by the UI's configured chains.
 * Only shows tokens/chains that are:
 * 1. Configured by the UI (in MAINNET_CHAINS or TESTNET_CHAINS)
 * 2. AND supported by the protocol (returned by asset discovery)
 */
export function useTokenConfig() {
  const isTestnet = useIsTestnet();
  const discoveryContext = useDiscoveredAssetsSafe();

  return useMemo(() => {
    const configuredChainIds = (isTestnet ? TESTNET_CHAINS : MAINNET_CHAINS).map((c) => c.id);

    if (!discoveryContext?.discoveredAssets) {
      return {
        SUPPORTED_TOKEN_BY_CHAIN_ID: {} as Record<number, readonly string[]>,
        TOKEN_INFO: {} as Record<number, Record<string, UITokenInfo>>,
        isDiscovered: false,
        isDiscovering: discoveryContext?.isDiscovering ?? true,
        discoveryError: discoveryContext?.discoveryError ?? null,
      };
    }

    const { supportedTokensByChain, tokenInfo } = discoveryContext.discoveredAssets;

    const filteredTokensByChain: Record<number, readonly string[]> = {};
    const filteredTokenInfo: Record<number, Record<string, UITokenInfo>> = {};

    for (const chainId of configuredChainIds) {
      if (supportedTokensByChain[chainId]?.length > 0) {
        filteredTokensByChain[chainId] = supportedTokensByChain[chainId];
      }
      if (tokenInfo[chainId] && Object.keys(tokenInfo[chainId]).length > 0) {
        filteredTokenInfo[chainId] = tokenInfo[chainId];
      }
    }

    return {
      SUPPORTED_TOKEN_BY_CHAIN_ID: filteredTokensByChain,
      TOKEN_INFO: filteredTokenInfo,
      isDiscovered: true,
      isDiscovering: false,
      discoveryError: null,
    };
  }, [isTestnet, discoveryContext]);
}

/**
 * Hook to get network-specific chain configuration
 *
 * Returns chains filtered by discovery results.
 * Only shows chains that have discovered assets available.
 */
export function useChainConfig() {
  const isTestnet = useIsTestnet();
  const discoveryContext = useDiscoveredAssetsSafe();

  return useMemo(() => {
    const allConfiguredChains = isTestnet ? TESTNET_CHAINS : MAINNET_CHAINS;
    const discoveryError = discoveryContext?.discoveryError ?? null;
    const refetchAssets = discoveryContext?.refetchAssets ?? (async () => {});

    if (!discoveryContext?.discoveredAssets) {
      return {
        SUPPORTED_CHAINS: [] as Chain[],
        ALL_CONFIGURED_CHAINS: allConfiguredChains,
        DEFAULT_INPUT_CHAIN_ID: isTestnet ? sepolia.id : base.id,
        DEFAULT_OUTPUT_CHAIN_ID: isTestnet ? baseSepolia.id : arbitrum.id,
        isDiscovered: false,
        isDiscovering: discoveryContext?.isDiscovering ?? true,
        discoveryError,
        refetchAssets,
        getChain: () => undefined,
        getExplorerTxUrl: () => undefined,
      };
    }

    const { supportedChainIds } = discoveryContext.discoveredAssets;

    const SUPPORTED_CHAINS = allConfiguredChains.filter((chain) => supportedChainIds.includes(chain.id));

    const defaultInput = isTestnet ? sepolia.id : base.id;
    const defaultOutput = isTestnet ? baseSepolia.id : arbitrum.id;

    const DEFAULT_INPUT_CHAIN_ID = SUPPORTED_CHAINS.some((c) => c.id === defaultInput)
      ? defaultInput
      : (SUPPORTED_CHAINS[0]?.id ?? defaultInput);

    const DEFAULT_OUTPUT_CHAIN_ID = SUPPORTED_CHAINS.some((c) => c.id === defaultOutput)
      ? defaultOutput
      : (SUPPORTED_CHAINS[1]?.id ?? SUPPORTED_CHAINS[0]?.id ?? defaultOutput);

    const getChain = (chainId?: number): Chain | undefined => {
      if (!chainId) return undefined;
      return SUPPORTED_CHAINS.find((c) => c.id === chainId);
    };

    const getExplorerTxUrl = (chainId?: number, txHash?: string): string | undefined => {
      if (!chainId || !txHash) return undefined;
      const chain = getChain(chainId);
      const explorerUrl = chain?.blockExplorers?.default?.url;
      return explorerUrl ? `${explorerUrl}/tx/${txHash}` : undefined;
    };

    return {
      SUPPORTED_CHAINS,
      ALL_CONFIGURED_CHAINS: allConfiguredChains,
      DEFAULT_INPUT_CHAIN_ID,
      DEFAULT_OUTPUT_CHAIN_ID,
      isDiscovered: true,
      isDiscovering: false,
      discoveryError,
      refetchAssets,
      getChain,
      getExplorerTxUrl,
    };
  }, [isTestnet, discoveryContext]);
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
