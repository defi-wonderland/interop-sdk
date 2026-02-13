'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { decodeAddress } from '@wonderland/interop-addresses';
import { getAssetDiscoveryServices } from '../services/sdk';
import type { DiscoveredAssets, UITokenInfo } from '../types/assets';
import type { DiscoveredAssets as SdkDiscoveredAssets } from '@wonderland/interop-cross-chain';
import type { Hex } from 'viem';

interface UseAssetDiscoveryResult {
  /** Discovered assets, null if not yet loaded */
  assets: DiscoveredAssets | null;
  /** Whether discovery is in progress */
  isLoading: boolean;
  /** Error if discovery failed */
  error: Error | null;
  /** Timestamp when assets were last fetched */
  lastFetchedAt: number | null;
  /** Retry discovery (useful after failures) */
  retry: () => void;
}

interface ProviderDiscoveryResult {
  providerId: string;
  result: SdkDiscoveredAssets;
}

/**
 * Parse a CAIP-2 chain identifier (e.g. "eip155:1") to a numeric chain ID.
 */
function parseCaip2ChainId(caip2: string): number | null {
  const parts = caip2.split(':');
  if (parts.length !== 2) return null;
  const num = Number(parts[1]);
  return Number.isNaN(num) ? null : num;
}

/**
 * Transform SDK discovery results (CAIP-2 keyed, EIP-7930 addresses) to UI-friendly format
 * (numeric chain IDs, decoded EVM addresses, provider attribution).
 */
function transformToUiAssets(providerResults: ProviderDiscoveryResult[]): DiscoveredAssets {
  const supportedTokensByChain: Record<number, string[]> = {};
  const tokenInfo: Record<number, Record<string, UITokenInfo>> = {};
  const chainIdSet = new Set<number>();

  for (const { providerId, result } of providerResults) {
    for (const caip2ChainId of result.chainIds) {
      const numericChainId = parseCaip2ChainId(caip2ChainId);
      if (numericChainId === null) continue;

      chainIdSet.add(numericChainId);

      const interopAddresses = result.tokensByChain[caip2ChainId] ?? [];

      if (!supportedTokensByChain[numericChainId]) {
        supportedTokensByChain[numericChainId] = [];
      }
      if (!tokenInfo[numericChainId]) {
        tokenInfo[numericChainId] = {};
      }

      for (const interopAddress of interopAddresses) {
        // Decode EIP-7930 interop address to raw EVM address
        let rawAddress: string;
        try {
          const decoded = decodeAddress(interopAddress as Hex);
          rawAddress = decoded.address ?? interopAddress;
        } catch {
          rawAddress = interopAddress;
        }

        if (!supportedTokensByChain[numericChainId].includes(rawAddress)) {
          supportedTokensByChain[numericChainId].push(rawAddress);
        }

        const sdkMeta = result.tokenMetadata[interopAddress];

        const existing = tokenInfo[numericChainId][rawAddress];
        if (existing) {
          if (!existing.providers.includes(providerId)) {
            existing.providers.push(providerId);
          }
        } else {
          tokenInfo[numericChainId][rawAddress] = {
            symbol: sdkMeta?.symbol ?? 'UNKNOWN',
            decimals: sdkMeta?.decimals ?? 18,
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
 * Uses individual AssetDiscoveryService instances per provider, aggregates results,
 * and transforms them to a UI-friendly DiscoveredAssets structure with numeric chain
 * IDs and decoded EVM addresses.
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
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);

  const fetchAssets = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const services = getAssetDiscoveryServices();
      const promises = Array.from(services.entries()).map(async ([providerId, service]) => {
        try {
          const result = await service.getSupportedAssets({ chainIds });
          return { providerId, result };
        } catch (err) {
          console.warn(`Asset discovery failed for provider ${providerId}:`, err);
          return null;
        }
      });

      const settled = await Promise.all(promises);
      const providerResults = settled.filter((r): r is ProviderDiscoveryResult => r !== null);

      if (providerResults.length === 0) {
        throw new Error('No assets discovered from any provider');
      }

      setAssets(transformToUiAssets(providerResults));
      setLastFetchedAt(Date.now());
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

  return useMemo(
    () => ({ assets, isLoading, error, lastFetchedAt, retry: fetchAssets }),
    [assets, isLoading, error, lastFetchedAt, fetchAssets],
  );
}
