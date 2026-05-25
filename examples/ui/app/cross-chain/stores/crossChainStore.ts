import { create } from 'zustand';
import { buildExecutor } from '../services/sdk';
import {
  readBuildModeFromUrl,
  readGaslessSubmissionFromUrl,
  readIsTestnetFromUrl,
  writeBuildModeParam,
  writeGaslessSubmissionParam,
  writeIsTestnetParam,
} from '../utils/crossChainUrlHelper';
import type { Aggregator, SubmissionMode } from '@wonderland/interop-cross-chain';

export type SwapFormMode = 'getQuotes' | 'buildQuote';

/** buildQuote always submits as a user transaction; gasless is only valid in getQuotes mode. */
function resolveSubmissionMode(mode: SwapFormMode, preferred: SubmissionMode): SubmissionMode {
  return mode === 'buildQuote' ? 'user-transaction' : preferred;
}

interface CrossChainState {
  isTestnet: boolean;
  executor: Aggregator;
  mode: SwapFormMode;
  buildQuoteProviderId: string;
  submissionMode: SubmissionMode;
  setIsTestnet: (isTestnet: boolean) => void;
  setMode: (mode: SwapFormMode) => void;
  setBuildQuoteProviderId: (providerId: string) => void;
  setSubmissionMode: (submissionMode: SubmissionMode) => void;
}

const initialIsTestnet = readIsTestnetFromUrl();
const initialMode: SwapFormMode = readBuildModeFromUrl() ? 'buildQuote' : 'getQuotes';
const preferredSubmissionMode: SubmissionMode = readGaslessSubmissionFromUrl() ? 'gasless' : 'user-transaction';
const initialSubmissionMode = resolveSubmissionMode(initialMode, preferredSubmissionMode);

export const useCrossChainStore = create<CrossChainState>((set, get) => ({
  isTestnet: initialIsTestnet,
  executor: buildExecutor(initialIsTestnet, initialSubmissionMode),
  mode: initialMode,
  buildQuoteProviderId: 'across',
  submissionMode: initialSubmissionMode,

  setIsTestnet: (isTestnet) => {
    if (isTestnet === get().isTestnet) return;
    writeIsTestnetParam(isTestnet);
    set({ isTestnet, executor: buildExecutor(isTestnet, get().submissionMode) });
  },

  setMode: (mode) => {
    if (mode === get().mode) return;
    const nextSubmissionMode = resolveSubmissionMode(mode, get().submissionMode);
    const submissionModeChanged = nextSubmissionMode !== get().submissionMode;

    writeBuildModeParam(mode === 'buildQuote');
    if (submissionModeChanged) {
      writeGaslessSubmissionParam(false);
      set({
        mode,
        submissionMode: nextSubmissionMode,
        executor: buildExecutor(get().isTestnet, nextSubmissionMode),
      });
    } else {
      set({ mode });
    }
  },

  setBuildQuoteProviderId: (buildQuoteProviderId) => set({ buildQuoteProviderId }),

  setSubmissionMode: (submissionMode) => {
    if (submissionMode === get().submissionMode) return;
    writeGaslessSubmissionParam(submissionMode === 'gasless');
    set({ submissionMode, executor: buildExecutor(get().isTestnet, submissionMode) });
  },
}));
