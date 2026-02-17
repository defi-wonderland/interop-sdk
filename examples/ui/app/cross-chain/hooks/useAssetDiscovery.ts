'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChainIdentifier, decodeAddress, fromChainIdentifier } from '@wonderland/interop-addresses';
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
  /** Retry discovery after a failure */
  retry: () => void;
}

interface ProviderDiscoveryResult {
  providerId: string;
  result: SdkDiscoveredAssets;
}

/**
 * Transform SDK discovery results (CAIP-350 keyed, EIP-7930 addresses) to UI-friendly format
 * (numeric chain IDs, decoded EVM addresses, provider attribution).
 */
function transformToUiAssets(providerResults: ProviderDiscoveryResult[]): DiscoveredAssets {
  const supportedTokensByChain: Record<number, string[]> = {};
  const tokenInfo: Record<number, Record<string, UITokenInfo>> = {};
  const chainIdSet = new Set<number>();

  for (const { providerId, result } of providerResults) {
    for (const chainIdentifier of Object.keys(result.tokensByChain) as ChainIdentifier[]) {
      let numericChainId: number;
      try {
        numericChainId = fromChainIdentifier(chainIdentifier).chainReference;
      } catch {
        continue;
      }

      chainIdSet.add(numericChainId);

      const interopAddresses = result.tokensByChain[chainIdentifier] ?? [];

      if (!supportedTokensByChain[numericChainId]) {
        supportedTokensByChain[numericChainId] = [];
      }
      if (!tokenInfo[numericChainId]) {
        tokenInfo[numericChainId] = {};
      }

      for (const interopAddress of interopAddresses) {
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
