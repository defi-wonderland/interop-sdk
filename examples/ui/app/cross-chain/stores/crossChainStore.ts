import { create } from 'zustand';
import { buildExecutor } from '../services/sdk';
import type { Aggregator } from '@wonderland/interop-cross-chain';

export type SwapFormMode = 'getQuotes' | 'buildQuote';

const TESTNET_QUERY_PARAM = 'testnet';
const MODE_QUERY_PARAM = 'mode';
const MODE_BUILD_VALUE = 'build';

function readIsTestnetFromUrl(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get(TESTNET_QUERY_PARAM) === 'true';
}

function readModeFromUrl(): SwapFormMode {
  if (typeof window === 'undefined') return 'getQuotes';
  const value = new URLSearchParams(window.location.search).get(MODE_QUERY_PARAM);
  return value === MODE_BUILD_VALUE ? 'buildQuote' : 'getQuotes';
}

interface CrossChainState {
  isTestnet: boolean;
  executor: Aggregator;
  mode: SwapFormMode;
  buildQuoteProviderId: string;
  setIsTestnet: (isTestnet: boolean) => void;
  setMode: (mode: SwapFormMode) => void;
  setBuildQuoteProviderId: (providerId: string) => void;
}

const initialIsTestnet = readIsTestnetFromUrl();

export const useCrossChainStore = create<CrossChainState>((set, get) => ({
  isTestnet: initialIsTestnet,
  executor: buildExecutor(initialIsTestnet),
  mode: readModeFromUrl(),
  buildQuoteProviderId: 'across',

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

  setMode: (mode: SwapFormMode) => {
    if (mode === get().mode) return;
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (mode === 'buildQuote') {
        url.searchParams.set(MODE_QUERY_PARAM, MODE_BUILD_VALUE);
      } else {
        url.searchParams.delete(MODE_QUERY_PARAM);
      }
      if (url.search !== window.location.search) {
        window.history.replaceState({}, '', url.toString());
      }
    }
    set({ mode });
  },
  setBuildQuoteProviderId: (providerId: string) => set({ buildQuoteProviderId: providerId }),
}));
