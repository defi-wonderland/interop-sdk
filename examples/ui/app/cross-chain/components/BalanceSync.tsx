'use client';

import { useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useDiscoveredAssets } from '../providers/AssetDiscoveryProvider';
import { useBalanceStore } from '../stores/balanceStore';

export function BalanceSync() {
  const { address, isConnected } = useAccount();
  const { discoveredAssets } = useDiscoveredAssets();
  const { fetchAllBalances, clearAll } = useBalanceStore();

  useEffect(() => {
    if (!isConnected) {
      clearAll();
      return;
    }

    if (!address || !discoveredAssets) return;

    fetchAllBalances(address, discoveredAssets);
  }, [isConnected, address, discoveredAssets, fetchAllBalances, clearAll]);

  return null;
}
