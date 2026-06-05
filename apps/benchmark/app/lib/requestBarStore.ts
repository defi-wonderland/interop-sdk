'use client';

import { create } from 'zustand';
import { ASSETS, AssetSymbol, type AssetPreset } from './assets';
import { ChainId } from './chains';
import {
  INITIAL_AMOUNT,
  INITIAL_ASSET_SYMBOL,
  INITIAL_FROM_CHAIN_ID,
  INITIAL_PRESET,
  INITIAL_TO_CHAIN_ID,
} from './requestBarDefaults';
import type { RaceRow } from '~/components/race-table/types';

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

export type RequestPreset = AssetPreset;

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
  setAssetSymbol: (assetSymbol) =>
    set((state) => {
      const request = { ...state.request, assetSymbol };
      // Presets are denominated in the asset, so a selected preset must be
      // re-applied in the new denomination. Presets are index-aligned across
      // assets; a manually typed amount is left untouched.
      if (state.request.selectedPreset !== null) {
        const previousIndex = ASSETS[state.request.assetSymbol].presets.findIndex(
          (preset) => preset.label === state.request.selectedPreset,
        );
        const nextPresets = ASSETS[assetSymbol].presets;
        const next = nextPresets[previousIndex] ?? nextPresets[0];
        request.amount = next.amount;
        request.selectedPreset = next.label;
      }
      return { request };
    }),
  setAmount: ({ amount, selectedPreset }) =>
    set((state) => ({
      request: {
        ...state.request,
        amount,
        selectedPreset: selectedPreset === undefined ? state.request.selectedPreset : selectedPreset,
      },
    })),
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
