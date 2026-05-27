'use client';

import { create } from 'zustand';
import { AssetSymbol } from './assets';
import { ChainId } from './chains';
import type { RaceRow } from '~/components/race-table/types';

export const INITIAL_FROM_CHAIN_ID = ChainId.Arbitrum;
export const INITIAL_TO_CHAIN_ID = ChainId.Base;
export const INITIAL_ASSET_SYMBOL = AssetSymbol.USDC;
export const INITIAL_AMOUNT = '100.00';
export const INITIAL_PRESET = '$100';

export interface RequestBarRequest {
  fromChainId: ChainId;
  toChainId: ChainId;
  assetSymbol: AssetSymbol;
  amount: string;
  selectedPreset: string | null;
}

export interface AmountUpdate {
  amount: string;
  selectedPreset?: string | null;
}

export interface RequestPreset {
  label: string;
  amount: string;
}

interface RequestBarState {
  request: RequestBarRequest;
  rows: RaceRow[];
  setFromChainId: (fromChainId: ChainId) => void;
  setToChainId: (toChainId: ChainId) => void;
  setAssetSymbol: (assetSymbol: AssetSymbol) => void;
  setAmount: (update: AmountUpdate) => void;
  setPreset: (preset: RequestPreset) => void;
  swapChains: () => void;
  setRows: (rows: RaceRow[]) => void;
}

const INITIAL_REQUEST: RequestBarRequest = {
  fromChainId: INITIAL_FROM_CHAIN_ID,
  toChainId: INITIAL_TO_CHAIN_ID,
  assetSymbol: INITIAL_ASSET_SYMBOL,
  amount: INITIAL_AMOUNT,
  selectedPreset: INITIAL_PRESET,
};

export const useRequestBarStore = create<RequestBarState>((set) => ({
  request: INITIAL_REQUEST,
  rows: [],
  setFromChainId: (fromChainId) => set((state) => ({ request: { ...state.request, fromChainId } })),
  setToChainId: (toChainId) => set((state) => ({ request: { ...state.request, toChainId } })),
  setAssetSymbol: (assetSymbol) => set((state) => ({ request: { ...state.request, assetSymbol } })),
  setAmount: ({ amount, selectedPreset = null }) =>
    set((state) => ({ request: { ...state.request, amount, selectedPreset } })),
  setPreset: ({ amount, label }) => set((state) => ({ request: { ...state.request, amount, selectedPreset: label } })),
  swapChains: () =>
    set((state) => ({
      request: {
        ...state.request,
        fromChainId: state.request.toChainId,
        toChainId: state.request.fromChainId,
      },
    })),
  setRows: (rows) => set({ rows }),
}));
