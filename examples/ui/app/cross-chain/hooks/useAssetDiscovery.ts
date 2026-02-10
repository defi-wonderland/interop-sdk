'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { decodeAddress } from '@wonderland/interop-addresses';
import { getAssetDiscoveryServices } from '../services/sdk';
import type { AssetDiscoveryResult, TokenInfo } from '@wonderland/interop-cross-chain';
import type { Hex } from 'viem';

/**
 * Discovered assets in UI-friendly format
 */
export interface DiscoveredAssets {
  /** Tokens by chain ID (chainId -> token addresses) */
  supportedTokensByChain: Record<number, readonly string[]>;
  /** Token info by chain and address (chainId -> address -> info) */
  tokenInfo: Record<number, Record<string, TokenInfo>>;
  /** All supported chain IDs */
  supportedChainIds: number[];
}

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

/**
 * Transform SDK discovery result to UI-friendly format
 * Handles EIP-7930 address decoding
 */
function transformDiscoveryResult(results: AssetDiscoveryResult[], filterChainIds?: number[]): DiscoveredAssets {
  const supportedTokensByChain: Record<number, string[]> = {};
  const tokenInfo: Record<number, Record<string, TokenInfo>> = {};
  const chainIdSet = new Set<number>();

  for (const result of results) {
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

        tokenInfo[chainId][normalizedAddress] = {
          symbol: asset.symbol,
          decimals: asset.decimals,
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
        const promises = Array.from(services.values()).map(async (service) => {
          try {
            return await service.getSupportedAssets({
              chainIds,
              forceRefresh,
            });
          } catch (err) {
            console.warn('Asset discovery failed for a provider:', err);
            return null;
          }
        });

        const settled = await Promise.all(promises);
        const results = settled.filter(Boolean) as AssetDiscoveryResult[];

        if (results.length === 0) {
          throw new Error('No assets discovered from any provider');
        }

        setAssets(transformDiscoveryResult(results, chainIds));
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
