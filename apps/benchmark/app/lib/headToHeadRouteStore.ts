'use client';

import { create } from 'zustand';
import { AssetSymbol } from './assets';
import { ChainId } from './chains';
import { INITIAL_ASSET_SYMBOL, INITIAL_FROM_CHAIN_ID, INITIAL_TO_CHAIN_ID } from './requestBarDefaults';

export interface HeadToHeadRoute {
  fromChainId: ChainId;
  toChainId: ChainId;
  assetSymbol: AssetSymbol;
}

interface HeadToHeadRouteState {
  route: HeadToHeadRoute;
  setFromChainId: (fromChainId: ChainId) => void;
  setToChainId: (toChainId: ChainId) => void;
  setAssetSymbol: (assetSymbol: AssetSymbol) => void;
  swapChains: () => void;
}

const INITIAL_ROUTE: HeadToHeadRoute = {
  fromChainId: INITIAL_FROM_CHAIN_ID,
  toChainId: INITIAL_TO_CHAIN_ID,
  assetSymbol: INITIAL_ASSET_SYMBOL,
};

export const useHeadToHeadRouteStore = create<HeadToHeadRouteState>((set) => ({
  route: INITIAL_ROUTE,
  setFromChainId: (fromChainId) => set((state) => ({ route: { ...state.route, fromChainId } })),
  setToChainId: (toChainId) => set((state) => ({ route: { ...state.route, toChainId } })),
  setAssetSymbol: (assetSymbol) => set((state) => ({ route: { ...state.route, assetSymbol } })),
  swapChains: () =>
    set((state) => ({
      route: {
        ...state.route,
        fromChainId: state.route.toChainId,
        toChainId: state.route.fromChainId,
      },
    })),
}));
