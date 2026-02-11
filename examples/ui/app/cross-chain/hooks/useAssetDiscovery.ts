'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { decodeAddress } from '@wonderland/interop-addresses';
import { getAssetDiscoveryServices } from '../services/sdk';
import type { DiscoveredAssets, UITokenInfo } from '../types/assets';
import type { AssetDiscoveryResult } from '@wonderland/interop-cross-chain';
import type { Hex } from 'viem';

interface UseAssetDiscoveryResult {
  /** Discovered assets, null if not yet loaded */
  assets: DiscoveredAssets | null;
  /** Whether discovery is in progress */
  isLoading: boolean;
  /** Error if discovery failed */
  error: Error | null;
  /** Refetch assets (force refresh) */
  refetch: () => Promise<void>;
  /** Timestamp when assets were last fetched */
  lastFetchedAt: number | null;
}

interface ProviderAssetResult {
  providerId: string;
  result: AssetDiscoveryResult;
}

/**
 * Transform SDK discovery results to UI-friendly format
 * Handles EIP-7930 address decoding and tracks provider attribution
 */
function transformDiscoveryResult(providerResults: ProviderAssetResult[], filterChainIds?: number[]): DiscoveredAssets {
  const supportedTokensByChain: Record<number, string[]> = {};
  const tokenInfo: Record<number, Record<string, UITokenInfo>> = {};
  const chainIdSet = new Set<number>();

  for (const { providerId, result } of providerResults) {
    for (const network of result.networks) {
      const { chainId, assets } = network;

      if (filterChainIds && !filterChainIds.includes(chainId)) {
        continue;
      }

      chainIdSet.add(chainId);

      if (!supportedTokensByChain[chainId]) {
        supportedTokensByChain[chainId] = [];
      }
      if (!tokenInfo[chainId]) {
        tokenInfo[chainId] = {};
      }

      for (const asset of assets) {
        let rawAddress: string;
        try {
          const decoded = decodeAddress(asset.address as Hex);
          rawAddress = decoded.address ?? asset.address;
        } catch {
          rawAddress = asset.address;
        }

        const normalizedAddress = rawAddress;

        if (!supportedTokensByChain[chainId].includes(normalizedAddress)) {
          supportedTokensByChain[chainId].push(normalizedAddress);
        }

        const existing = tokenInfo[chainId][normalizedAddress];
        if (existing) {
          if (!existing.providers.includes(providerId)) {
            existing.providers.push(providerId);
          }
        } else {
          tokenInfo[chainId][normalizedAddress] = {
            symbol: asset.symbol,
            decimals: asset.decimals,
            providers: [providerId],
          };
        }
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
 * @param options.chainIds - Filter results to specific chain IDs.
 *   **Must be a stable reference** (e.g. via useMemo) to avoid infinite refetches.
 * @param options.enabled - Whether to enable discovery (default: true)
 */
export function useAssetDiscovery(options?: { chainIds?: number[]; enabled?: boolean }): UseAssetDiscoveryResult {
  const { chainIds, enabled = true } = options ?? {};

  const [assets, setAssets] = useState<DiscoveredAssets | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);

  const fetchAssets = useCallback(
    async (forceRefresh = false) => {
      if (!enabled) return;

      setIsLoading(true);
      setError(null);

      try {
        const services = getAssetDiscoveryServices();
        const promises = Array.from(services.entries()).map(async ([providerId, service]) => {
          try {
            const result = await service.getSupportedAssets({
              chainIds,
              forceRefresh,
            });
            return { providerId, result };
          } catch (err) {
            console.warn(`Asset discovery failed for provider ${providerId}:`, err);
            return null;
          }
        });

        const settled = await Promise.all(promises);
        const providerResults = settled.filter(Boolean) as ProviderAssetResult[];

        if (providerResults.length === 0) {
          throw new Error('No assets discovered from any provider');
        }

        setAssets(transformDiscoveryResult(providerResults, chainIds));
        setLastFetchedAt(Date.now());
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    },
    [enabled, chainIds],
  );

  const refetch = useCallback(() => fetchAssets(true), [fetchAssets]);

  useEffect(() => {
    if (enabled) {
      fetchAssets();
    }
  }, [enabled, fetchAssets]);

  return useMemo(
    () => ({ assets, isLoading, error, refetch, lastFetchedAt }),
    [assets, isLoading, error, refetch, lastFetchedAt],
  );
}
