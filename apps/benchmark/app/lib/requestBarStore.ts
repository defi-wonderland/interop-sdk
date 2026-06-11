'use client';

import { create } from 'zustand';
import { ASSETS, AssetSymbol } from './assets';
import { ChainId } from './chains';
import {
  INITIAL_AMOUNT,
  INITIAL_ASSET_SYMBOL,
  INITIAL_FROM_CHAIN_ID,
  INITIAL_PRESET_INDEX,
  INITIAL_TO_CHAIN_ID,
} from './requestBarDefaults';
import type { RaceRow } from '~/components/race-table/types';

export interface RequestBarRequest {
  fromChainId: ChainId;
  toChainId: ChainId;
  assetSymbol: AssetSymbol;
  amount: string;
  /**
   * Index into the selected asset's `presets`, or null for a manually typed
   * amount. An index (not the label) so display text stays free to change,
   * and so switching assets maps to the equivalent preset positionally.
   */
  selectedPreset: number | null;
}

export interface AmountUpdate {
  amount: string;
  selectedPreset?: number | null;
}

interface RequestBarState {
  request: RequestBarRequest;
  rows: RaceRow[];
  setFromChainId: (fromChainId: ChainId) => void;
  setToChainId: (toChainId: ChainId) => void;
  setAssetSymbol: (assetSymbol: AssetSymbol) => void;
  setAmount: (update: AmountUpdate) => void;
  setPreset: (presetIndex: number) => void;
  swapChains: () => void;
  setRows: (rows: RaceRow[]) => void;
}

const INITIAL_REQUEST: RequestBarRequest = {
  fromChainId: INITIAL_FROM_CHAIN_ID,
  toChainId: INITIAL_TO_CHAIN_ID,
  assetSymbol: INITIAL_ASSET_SYMBOL,
  amount: INITIAL_AMOUNT,
  selectedPreset: INITIAL_PRESET_INDEX,
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
        const nextPresets = ASSETS[assetSymbol].presets;
        const nextIndex = state.request.selectedPreset < nextPresets.length ? state.request.selectedPreset : 0;
        const next = nextPresets[nextIndex];
        if (next) {
          request.amount = next.amount;
          request.selectedPreset = nextIndex;
        }
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
  setPreset: (presetIndex) =>
    set((state) => {
      const preset = ASSETS[state.request.assetSymbol].presets[presetIndex];
      if (!preset) return state;
      return { request: { ...state.request, amount: preset.amount, selectedPreset: presetIndex } };
    }),
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
