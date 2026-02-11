import { create } from 'zustand';
import { AssetService } from '../services/assetService';
import type { DiscoveredAssets } from '../types/assets';
import type { Config } from 'wagmi';

export interface TokenBalance {
  raw: bigint;
  formatted: string;
}

export interface BalanceTarget {
  chainId: number;
  token: string;
}

interface BalanceState {
  balances: Record<number, Record<string, TokenBalance>>;
  isLoading: boolean;
  error: Error | null;
  _discoveredAssets: DiscoveredAssets | null;
}

interface BalanceActions {
  fetchAllBalances(config: Config, userAddress: string, discoveredAssets: DiscoveredAssets): Promise<void>;
  updateBalances(config: Config, userAddress: string, targets: BalanceTarget[]): Promise<void>;
  clearAll(): void;
}

export const useBalanceStore = create<BalanceState & BalanceActions>((set, get) => ({
  balances: {},
  isLoading: false,
  error: null,
  _discoveredAssets: null,

  fetchAllBalances: async (config, userAddress, discoveredAssets) => {
    set({ isLoading: true, error: null, _discoveredAssets: discoveredAssets });

    try {
      const service = new AssetService(config);
      const balances = await service.fetchAllBalances(userAddress, discoveredAssets);
      set({ balances, isLoading: false });
    } catch (err) {
      const parsedError = err instanceof Error ? err : new Error(String(err));
      set({ error: parsedError, isLoading: false });
    }
  },

  updateBalances: async (config, userAddress, targets) => {
    const { _discoveredAssets } = get();
    if (!_discoveredAssets || targets.length === 0) return;

    const service = new AssetService(config);
    const updated = await service.fetchTargetedBalances(userAddress, targets, _discoveredAssets);

    set((state) => {
      const balances = { ...state.balances };
      for (const [chainIdStr, chainBalances] of Object.entries(updated)) {
        const chainId = Number(chainIdStr);
        balances[chainId] = { ...balances[chainId], ...chainBalances };
      }
      return { balances };
    });
  },

  clearAll: () => set({ balances: {}, isLoading: false, error: null, _discoveredAssets: null }),
}));
