'use client';

import { create } from 'zustand';
import { AssetSymbol } from './assets';
import { ChainId } from './chains';

export const INITIAL_FROM_CHAIN_ID = ChainId.Base;
export const INITIAL_TO_CHAIN_ID = ChainId.Arbitrum;
export const INITIAL_ASSET_SYMBOL = AssetSymbol.USDC;
export const INITIAL_AMOUNT = '1,000.00';
export const INITIAL_PRESET = '$1k';

interface RequestBarState {
  fromChainId: ChainId;
  toChainId: ChainId;
  assetSymbol: AssetSymbol;
  amount: string;
  selectedPreset: string | null;
  runId: number;
  setFromChainId: (fromChainId: ChainId) => void;
  setToChainId: (toChainId: ChainId) => void;
  setAssetSymbol: (assetSymbol: AssetSymbol) => void;
  setAmount: (amount: string, selectedPreset?: string | null) => void;
  setPreset: (amount: string, selectedPreset: string) => void;
  swapChains: () => void;
  bumpRunId: () => void;
}

const bump = (runId: number) => runId + 1;

export const useRequestBarStore = create<RequestBarState>((set) => ({
  fromChainId: INITIAL_FROM_CHAIN_ID,
  toChainId: INITIAL_TO_CHAIN_ID,
  assetSymbol: INITIAL_ASSET_SYMBOL,
  amount: INITIAL_AMOUNT,
  selectedPreset: INITIAL_PRESET,
  runId: 0,
  setFromChainId: (fromChainId) =>
    set((state) => (state.fromChainId === fromChainId ? state : { fromChainId, runId: bump(state.runId) })),
  setToChainId: (toChainId) =>
    set((state) => (state.toChainId === toChainId ? state : { toChainId, runId: bump(state.runId) })),
  setAssetSymbol: (assetSymbol) =>
    set((state) => (state.assetSymbol === assetSymbol ? state : { assetSymbol, runId: bump(state.runId) })),
  setAmount: (amount, selectedPreset = null) => set({ amount, selectedPreset }),
  setPreset: (amount, selectedPreset) => set((state) => ({ amount, selectedPreset, runId: bump(state.runId) })),
  swapChains: () =>
    set((state) => ({
      fromChainId: state.toChainId,
      toChainId: state.fromChainId,
      runId: bump(state.runId),
    })),
  bumpRunId: () => set((state) => ({ runId: bump(state.runId) })),
}));
