'use client';

import { create } from 'zustand';
import { AssetSymbol } from './assets';
import { ChainId } from './chains';

export const INITIAL_FROM_CHAIN_ID = ChainId.Base;
export const INITIAL_TO_CHAIN_ID = ChainId.Arbitrum;
export const INITIAL_ASSET_SYMBOL = AssetSymbol.USDC;
export const INITIAL_AMOUNT = '1,000.00';
export const INITIAL_PRESET = '$1k';

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
  runId: number;
  setFromChainId: (fromChainId: ChainId) => void;
  setToChainId: (toChainId: ChainId) => void;
  setAssetSymbol: (assetSymbol: AssetSymbol) => void;
  setAmount: (update: AmountUpdate) => void;
  setPreset: (preset: RequestPreset) => void;
  swapChains: () => void;
  bumpRunId: () => void;
}

const bump = (runId: number) => runId + 1;

const INITIAL_REQUEST: RequestBarRequest = {
  fromChainId: INITIAL_FROM_CHAIN_ID,
  toChainId: INITIAL_TO_CHAIN_ID,
  assetSymbol: INITIAL_ASSET_SYMBOL,
  amount: INITIAL_AMOUNT,
  selectedPreset: INITIAL_PRESET,
};

export const useRequestBarStore = create<RequestBarState>((set) => ({
  request: INITIAL_REQUEST,
  runId: 0,
  setFromChainId: (fromChainId) =>
    set((state) =>
      state.request.fromChainId === fromChainId
        ? state
        : { request: { ...state.request, fromChainId }, runId: bump(state.runId) },
    ),
  setToChainId: (toChainId) =>
    set((state) =>
      state.request.toChainId === toChainId
        ? state
        : { request: { ...state.request, toChainId }, runId: bump(state.runId) },
    ),
  setAssetSymbol: (assetSymbol) =>
    set((state) =>
      state.request.assetSymbol === assetSymbol
        ? state
        : { request: { ...state.request, assetSymbol }, runId: bump(state.runId) },
    ),
  setAmount: ({ amount, selectedPreset = null }) =>
    set((state) => ({ request: { ...state.request, amount, selectedPreset } })),
  setPreset: ({ amount, label }) =>
    set((state) => ({ request: { ...state.request, amount, selectedPreset: label }, runId: bump(state.runId) })),
  swapChains: () =>
    set((state) => ({
      request: {
        ...state.request,
        fromChainId: state.request.toChainId,
        toChainId: state.request.fromChainId,
      },
      runId: bump(state.runId),
    })),
  bumpRunId: () => set((state) => ({ runId: bump(state.runId) })),
}));
