'use client';

import { create } from 'zustand';
import { ChainId } from './chains';
import { INITIAL_FROM_CHAIN_ID, INITIAL_TO_CHAIN_ID } from './requestBarDefaults';

// Head-to-head compares providers on a chain pair. The historical feeds are
// per chain pair, not per token, so there is no asset here.
export interface HeadToHeadRoute {
  fromChainId: ChainId;
  toChainId: ChainId;
}

interface HeadToHeadRouteState {
  route: HeadToHeadRoute;
  setFromChainId: (fromChainId: ChainId) => void;
  setToChainId: (toChainId: ChainId) => void;
  swapChains: () => void;
}

const INITIAL_ROUTE: HeadToHeadRoute = {
  fromChainId: INITIAL_FROM_CHAIN_ID,
  toChainId: INITIAL_TO_CHAIN_ID,
};

export const useHeadToHeadRouteStore = create<HeadToHeadRouteState>((set) => ({
  route: INITIAL_ROUTE,
  setFromChainId: (fromChainId) => set((state) => ({ route: { ...state.route, fromChainId } })),
  setToChainId: (toChainId) => set((state) => ({ route: { ...state.route, toChainId } })),
  swapChains: () =>
    set((state) => ({
      route: {
        ...state.route,
        fromChainId: state.route.toChainId,
        toChainId: state.route.fromChainId,
      },
    })),
}));
