'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { MAINNET_CHAINS, TESTNET_CHAINS } from '../constants/chains';
import { useAssetDiscovery, type DiscoveredAssets } from '../hooks/useAssetDiscovery';
import { useIsTestnet } from './NetworkProvider';

interface AssetDiscoveryContextValue {
  /** Discovered assets from providers */
  discoveredAssets: DiscoveredAssets | null;
  /** Whether discovery is in progress */
  isDiscovering: boolean;
  /** Error if discovery failed */
  discoveryError: Error | null;
  /** Refetch assets */
  refetchAssets: () => Promise<void>;
  /** When assets were last fetched */
  lastFetchedAt: number | null;
}

const AssetDiscoveryContext = createContext<AssetDiscoveryContextValue | null>(null);

interface AssetDiscoveryProviderProps {
  children: ReactNode;
}

/**
 * Provider that exposes asset discovery results via context.
 * Caching and deduplication are handled by the SDK internally.
 */
export function AssetDiscoveryProvider({ children }: AssetDiscoveryProviderProps) {
  const isTestnet = useIsTestnet();

  const chainIds = useMemo(() => (isTestnet ? TESTNET_CHAINS : MAINNET_CHAINS).map((c) => c.id), [isTestnet]);

  const { assets, isLoading, error, refetch, lastFetchedAt } = useAssetDiscovery({
    chainIds,
    enabled: true,
  });

  const value = useMemo<AssetDiscoveryContextValue>(
    () => ({
      discoveredAssets: assets,
      isDiscovering: isLoading,
      discoveryError: error,
      refetchAssets: refetch,
      lastFetchedAt,
    }),
    [assets, isLoading, error, refetch, lastFetchedAt],
  );

  return <AssetDiscoveryContext.Provider value={value}>{children}</AssetDiscoveryContext.Provider>;
}

/**
 * Hook to access discovered assets
 */
export function useDiscoveredAssets(): AssetDiscoveryContextValue {
  const context = useContext(AssetDiscoveryContext);
  if (!context) {
    throw new Error('useDiscoveredAssets must be used within an AssetDiscoveryProvider');
  }
  return context;
}

/**
 * Hook to safely access discovered assets (returns null if outside provider)
 */
export function useDiscoveredAssetsSafe(): AssetDiscoveryContextValue | null {
  return useContext(AssetDiscoveryContext);
}
