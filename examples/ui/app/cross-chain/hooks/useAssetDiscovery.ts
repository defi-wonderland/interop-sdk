'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { crossChainExecutor } from '../services/sdk';
import type { DiscoveredAssets } from '@wonderland/interop-cross-chain';

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
 * Hook to discover supported assets from all providers.
 *
 * Uses the ProviderExecutor.discoverAssets() method which aggregates results
 * from all configured providers and returns a DiscoveredAssets structure.
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
        const discovered = await crossChainExecutor.discoverAssets({
          chainIds,
          forceRefresh,
        });

        if (discovered.chainIds.length === 0) {
          throw new Error('No assets discovered from any provider');
        }

        setAssets(discovered);
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
