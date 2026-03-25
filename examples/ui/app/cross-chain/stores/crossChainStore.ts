import { create } from 'zustand';
import { buildExecutor } from '../services/sdk';
import type { Aggregator } from '@wonderland/interop-cross-chain';

const TESTNET_QUERY_PARAM = 'testnet';

function readIsTestnetFromUrl(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get(TESTNET_QUERY_PARAM) === 'true';
}

interface CrossChainState {
  isTestnet: boolean;
  executor: Aggregator;
  setIsTestnet: (isTestnet: boolean) => void;
}

const initialIsTestnet = readIsTestnetFromUrl();

export const useCrossChainStore = create<CrossChainState>((set, get) => ({
  isTestnet: initialIsTestnet,
  executor: buildExecutor(initialIsTestnet),

  setIsTestnet: (isTestnet: boolean) => {
    if (isTestnet === get().isTestnet) return;
    const url = new URL(window.location.href);
    if (isTestnet) {
      url.searchParams.set(TESTNET_QUERY_PARAM, 'true');
    } else {
      url.searchParams.delete(TESTNET_QUERY_PARAM);
    }
    window.history.replaceState({}, '', url.toString());

    set({ isTestnet, executor: buildExecutor(isTestnet) });
  },
}));
