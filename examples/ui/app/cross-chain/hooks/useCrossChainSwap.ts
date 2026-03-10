import { useState, useCallback } from 'react';
import { type ExecutableQuote } from '@wonderland/interop-cross-chain';
import { useDiscoveredAssets } from '../providers';
import { useFillWorkaround } from '../services/orderExecution/fillDetection';
import { STEP } from '../types/execution';
import { useBuildQuote, BuildQuoteStatus } from './useBuildQuote';
import { useQuotes, QuoteStatus } from './useQuotes';
import { useOrderExecution, useChainConfig } from '.';
import type { SwapFormMode } from '../components/SwapForm';
import type { Address } from 'viem';

export interface SwapSubmitParams {
  sender: string;
  recipient: string;
  inputChainId: number;
  outputChainId: number;
  inputTokenAddress: string;
  outputTokenAddress: string;
  inputAmount: string;
  inputAmountRaw: bigint;
  mode: SwapFormMode;
  outputAmount?: string;
  fillDeadlineSecs?: number;
}

function mapBuildStatusToQuoteStatus(buildStatus: BuildQuoteStatus): QuoteStatus {
  switch (buildStatus) {
    case BuildQuoteStatus.LOADING:
      return QuoteStatus.LOADING;
    case BuildQuoteStatus.SUCCESS:
      return QuoteStatus.SUCCESS;
    case BuildQuoteStatus.ERROR:
      return QuoteStatus.ERROR;
    default:
      return QuoteStatus.IDLE;
  }
}

export function useCrossChainSwap() {
  const { quotes, errors, status: quoteStatus, fetchQuotes, clearQuotes } = useQuotes();
  const {
    quote: builtQuote,
    error: buildError,
    status: buildStatus,
    buildQuote,
    clear: clearBuildQuote,
  } = useBuildQuote();
  const { state: rawExecutionState, execute, reset: resetExecution, abortTracking } = useOrderExecution();
  const executionState = useFillWorkaround(rawExecutionState, abortTracking);
  const chainConfig = useChainConfig();
  const { retryDiscovery } = useDiscoveredAssets();

  const [selectedInputToken, setSelectedInputToken] = useState<string>('');
  const [selectedOutputToken, setSelectedOutputToken] = useState<string>('');
  const [selectedQuote, setSelectedQuote] = useState<ExecutableQuote | null>(null);
  const [inputAmountRaw, setInputAmountRaw] = useState<bigint>(0n);
  const [inputChainId, setInputChainId] = useState<number>(0);
  const [outputChainId, setOutputChainId] = useState<number>(0);
  const [lastQuoteParams, setLastQuoteParams] = useState<Parameters<typeof fetchQuotes>[0] | null>(null);
  const [currentMode, setCurrentMode] = useState<SwapFormMode>('getQuotes');

  const isExecutionStarted = executionState.step !== STEP.IDLE;

  const effectiveQuotes: ExecutableQuote[] = currentMode === 'buildQuote' && builtQuote ? [builtQuote] : quotes;
  const effectiveErrors =
    currentMode === 'buildQuote' && buildError ? [{ errorMsg: buildError, error: new Error(buildError) }] : errors;
  const effectiveStatus = currentMode === 'buildQuote' ? mapBuildStatusToQuoteStatus(buildStatus) : quoteStatus;

  const handleSubmit = async (params: SwapSubmitParams) => {
    setSelectedInputToken(params.inputTokenAddress);
    setSelectedOutputToken(params.outputTokenAddress);
    setInputAmountRaw(params.inputAmountRaw);
    setInputChainId(params.inputChainId);
    setOutputChainId(params.outputChainId);
    setSelectedQuote(null);
    setCurrentMode(params.mode);
    resetExecution();

    if (params.mode === 'buildQuote') {
      if (!params.outputAmount) {
        clearQuotes();
        clearBuildQuote();
        return;
      }
      clearQuotes();
      setLastQuoteParams(null);
      await buildQuote({
        sender: params.sender,
        recipient: params.recipient,
        inputChainId: params.inputChainId,
        outputChainId: params.outputChainId,
        inputTokenAddress: params.inputTokenAddress,
        outputTokenAddress: params.outputTokenAddress,
        inputAmount: params.inputAmount,
        outputAmount: params.outputAmount,
        fillDeadlineSecs: params.fillDeadlineSecs,
      });
    } else {
      clearBuildQuote();
      setLastQuoteParams(params);
      await fetchQuotes(params);
    }
  };

  const handleSelectQuote = (quote: ExecutableQuote) => {
    setSelectedQuote(quote);
    resetExecution();
  };

  const handleExecuteQuote = async (quote: ExecutableQuote) => {
    setSelectedQuote(quote);
    const result = await execute(
      quote,
      selectedInputToken as Address,
      selectedOutputToken as Address,
      inputAmountRaw,
      inputChainId,
      outputChainId,
    );
    return result;
  };

  const handleInputChange = useCallback(() => {
    setSelectedQuote(null);
    setLastQuoteParams(null);
    clearQuotes();
    clearBuildQuote();
  }, [clearQuotes, clearBuildQuote]);

  const handleReset = useCallback(() => {
    resetExecution();
    setSelectedQuote(null);
    clearQuotes();
    clearBuildQuote();
  }, [resetExecution, clearQuotes, clearBuildQuote]);

  const handleRetry = lastQuoteParams ? () => fetchQuotes(lastQuoteParams) : undefined;

  return {
    chainConfig,
    retryDiscovery,
    effectiveQuotes,
    effectiveErrors,
    effectiveStatus,
    selectedInputToken,
    selectedOutputToken,
    selectedQuote,
    inputChainId,
    outputChainId,
    executionState,
    isExecutionStarted,
    handleSubmit,
    handleSelectQuote,
    handleExecuteQuote,
    handleInputChange,
    handleReset,
    handleRetry,
  };
}
