'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { crossChainExecutor } from '../services/sdk';
import type { DiscoveredAssets, UITokenInfo } from '../types/assets';
import type { DiscoveredAssets as SdkDiscoveredAssets } from '@wonderland/interop-cross-chain';

interface UseAssetDiscoveryResult {
  /** Discovered assets, null if not yet loaded */
  assets: DiscoveredAssets | null;
  /** Whether discovery is in progress */
  isLoading: boolean;
  /** Error if discovery failed */
  error: Error | null;
  /** Retry discovery after a failure */
  retry: () => void;
}

/**
 * Transform SDK DiscoveredAssets (numeric chain ID keys, plain 0x addresses)
 * to the UI-friendly format. Provider attribution is read directly from
 * tokenMetadata[chainId][addr].providers.
 */
function transformToUiAssets(sdkAssets: SdkDiscoveredAssets): DiscoveredAssets {
  const supportedTokensByChain: Record<number, string[]> = {};
  const tokenInfo: Record<number, Record<string, UITokenInfo>> = {};
  const chainIdSet = new Set<number>();

  for (const [chainIdStr, addresses] of Object.entries(sdkAssets.tokensByChain)) {
    const chainId = Number(chainIdStr);
    chainIdSet.add(chainId);

    supportedTokensByChain[chainId] ??= [];
    tokenInfo[chainId] ??= {};

    const chainMeta = sdkAssets.tokenMetadata[chainId] ?? {};

    for (const addr of addresses) {
      if (!supportedTokensByChain[chainId].includes(addr)) {
        supportedTokensByChain[chainId].push(addr);
      }

      const sdkMeta = chainMeta[addr.toLowerCase()];

      if (!tokenInfo[chainId][addr]) {
        tokenInfo[chainId][addr] = {
          symbol: sdkMeta?.symbol ?? 'UNKNOWN',
          decimals: sdkMeta?.decimals ?? 18,
          providers: sdkMeta?.providers ? [...sdkMeta.providers] : [],
        };
      }
    }
  }

  return {
    supportedTokensByChain,
    tokenInfo,
    supportedChainIds: Array.from(chainIdSet).sort((a, b) => a - b),
  };
}

/**
 * Hook to discover supported assets from all providers.
 *
 * Calls `executor.discoverAssets()` which aggregates across all providers,
 * handles partial failures, and returns a merged DiscoveredAssets with
 * per-asset provider attribution.
 *
 * Assets are permanently cached by the SDK after the first successful fetch.
 * The services are already prefetching when the executor is created, so by the
 * time this hook mounts the data is often ready immediately.
 *
 * @param options.chainIds - Filter results to specific chain IDs.
 *   **Must be a stable reference** (e.g. via useMemo) to avoid re-triggering the effect.
 * @param options.enabled - Whether to enable discovery (default: true)
 */
export function useAssetDiscovery(options?: { chainIds?: number[]; enabled?: boolean }): UseAssetDiscoveryResult {
  const { chainIds, enabled = true } = options ?? {};

  const [assets, setAssets] = useState<DiscoveredAssets | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);

  const fetchAssets = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const sdkAssets = await crossChainExecutor.discoverAssets({ chainIds });

      if (Object.keys(sdkAssets.tokensByChain).length === 0) {
        throw new Error('No assets discovered from any provider');
      }

      setAssets(transformToUiAssets(sdkAssets));
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [enabled, chainIds]);

  useEffect(() => {
    if (enabled) {
      fetchAssets();
    }
  }, [enabled, fetchAssets]);

  return useMemo(() => ({ assets, isLoading, error, retry: fetchAssets }), [assets, isLoading, error, fetchAssets]);
}
