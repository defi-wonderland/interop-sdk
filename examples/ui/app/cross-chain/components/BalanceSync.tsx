'use client';

import { useEffect } from 'react';
import { useAccount, useConfig } from 'wagmi';
import { useDiscoveredAssets } from '../providers/AssetDiscoveryProvider';
import { useBalanceStore } from '../stores/balanceStore';

export function BalanceSync() {
  const { address, isConnected } = useAccount();
  const config = useConfig();
  const { discoveredAssets } = useDiscoveredAssets();
  const { fetchAllBalances, clearAll } = useBalanceStore();

  useEffect(() => {
    if (!isConnected) {
      clearAll();
      return;
    }

    if (!address || !discoveredAssets) return;

    fetchAllBalances(config, address, discoveredAssets);
  }, [isConnected, address, config, discoveredAssets, fetchAllBalances, clearAll]);

  return null;
}
