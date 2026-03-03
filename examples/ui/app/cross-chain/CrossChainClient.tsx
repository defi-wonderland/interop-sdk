'use client';

import { useState, useCallback } from 'react';
import { isNativeAddress, type ExecutableQuote } from '@wonderland/interop-cross-chain';
import { Footer, Navigation } from '../components';
import {
  DiscoveryLoading,
  DiscoveryError,
  DiscoveryEmpty,
  NetworkSwitch,
  OrderTracking,
  QuoteCard,
  QuoteDetails,
  QuoteList,
  SwapForm,
  Toast,
  TooltipProvider,
  type ToastType,
} from './components';
import { useOrderExecution, useChainConfig } from './hooks';
import { useQuotes, QuoteStatus } from './hooks/useQuotes';
import { useDiscoveredAssets } from './providers';
import { useFillWorkaround } from './services/orderExecution/fillDetection';
import { STEP } from './types/execution';
import type { Address } from 'viem';

interface ToastState {
  message: string;
  type: ToastType;
}

export function CrossChainClient() {
  const { quotes, errors, status: quoteStatus, fetchQuotes, clearQuotes } = useQuotes();
  const { state: rawExecutionState, execute, reset: resetExecution, abortTracking } = useOrderExecution();
  // WORKAROUND: OIF solver never finalizes — promote TRACKING→DONE on fillTxHash. Remove when solver is fixed.
  const executionState = useFillWorkaround(rawExecutionState, abortTracking);
  const chainConfig = useChainConfig();
  const { retryDiscovery } = useDiscoveredAssets();

  const [selectedInputToken, setSelectedInputToken] = useState<string>('');
  const [selectedOutputToken, setSelectedOutputToken] = useState<string>('');
  const [selectedQuote, setSelectedQuote] = useState<ExecutableQuote | null>(null);
  const [inputAmountRaw, setInputAmountRaw] = useState<bigint>(0n);
  const [inputChainId, setInputChainId] = useState<number>(0);
  const [outputChainId, setOutputChainId] = useState<number>(0);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [lastQuoteParams, setLastQuoteParams] = useState<Parameters<typeof fetchQuotes>[0] | null>(null);
  const isExecutionStarted = executionState.step !== STEP.IDLE;

  const closeToast = useCallback(() => {
    setToast(null);
  }, []);

  const handleSubmit = async (params: {
    sender: string;
    recipient: string;
    inputChainId: number;
    outputChainId: number;
    inputTokenAddress: string;
    outputTokenAddress: string;
    inputAmount: string;
    inputAmountRaw: bigint;
  }) => {
    setSelectedInputToken(params.inputTokenAddress);
    setSelectedOutputToken(params.outputTokenAddress);
    setInputAmountRaw(params.inputAmountRaw);
    setInputChainId(params.inputChainId);
    setOutputChainId(params.outputChainId);
    setSelectedQuote(null);
    setLastQuoteParams(params);
    resetExecution();
    await fetchQuotes(params);
  };

  const handleSelectQuote = (quote: ExecutableQuote) => {
    setSelectedQuote(quote);
    resetExecution();
  };

  const handleExecuteQuote = async (quote: ExecutableQuote) => {
    const result = await execute(
      quote,
      selectedInputToken as Address,
      selectedOutputToken as Address,
      inputAmountRaw,
      inputChainId,
      outputChainId,
    );
    if (result.userRejected) {
      setToast({ message: 'Transaction rejected', type: 'info' });
    }
  };

  const handleInputChange = useCallback(() => {
    setSelectedQuote(null);
    setLastQuoteParams(null);
    clearQuotes();
  }, [clearQuotes]);

  const handleReset = useCallback(() => {
    resetExecution();
    setSelectedQuote(null);
    clearQuotes();
  }, [resetExecution, clearQuotes]);

  return (
    <TooltipProvider>
      <div className='min-h-screen bg-background flex flex-col'>
        <Navigation />

        <div className='flex-1 flex flex-col max-w-7xl w-full mx-auto px-4 py-12 sm:px-6 sm:py-16'>
          <div className='flex-1 flex flex-col gap-12'>
            <header className='flex flex-col items-center gap-4 text-center relative'>
              <div className='absolute top-0 right-0'>
                <NetworkSwitch />
              </div>

              <div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-light text-accent text-xs font-medium'>
                EIP-7683 & Intents
              </div>
              <h1 className='text-4xl sm:text-5xl md:text-6xl font-bold text-text-primary'>Cross-Chain Intent Swap</h1>
              <p className='text-lg sm:text-xl text-text-secondary'>
                Experience seamless cross-chain transfers with intent-based routing
              </p>
            </header>

            <div className='grid grid-cols-1 lg:grid-cols-2 gap-8 items-start'>
              <div className='flex flex-col gap-6'>
                {chainConfig.isDiscovering && <DiscoveryLoading />}

                {!chainConfig.isDiscovering && chainConfig.discoveryError && (
                  <DiscoveryError error={chainConfig.discoveryError} onRetry={retryDiscovery} />
                )}

                {chainConfig.isDiscovered &&
                  !chainConfig.discoveryError &&
                  chainConfig.SUPPORTED_CHAINS.length === 0 && <DiscoveryEmpty />}

                {chainConfig.isDiscovered && chainConfig.SUPPORTED_CHAINS.length > 0 && (
                  <SwapForm
                    onSubmit={handleSubmit}
                    onInputChange={handleInputChange}
                    isLoading={quoteStatus === QuoteStatus.LOADING}
                    isDisabled={isExecutionStarted}
                  />
                )}

                {selectedQuote && !isExecutionStarted && <QuoteDetails quote={selectedQuote} />}
              </div>

              <div className='flex flex-col gap-4'>
                {isExecutionStarted && selectedQuote ? (
                  <>
                    <div className='rounded-xl border border-border bg-background/50 p-4'>
                      <h3 className='text-sm font-semibold text-text-primary mb-3'>Selected Quote</h3>
                      <QuoteCard
                        quote={selectedQuote}
                        inputTokenAddress={selectedInputToken}
                        outputTokenAddress={selectedOutputToken}
                        inputChainId={inputChainId}
                        outputChainId={outputChainId}
                        isSelected={true}
                        hideExecuteButton={true}
                      />
                    </div>
                    <OrderTracking
                      state={executionState}
                      onReset={handleReset}
                      skipApproval={isNativeAddress(selectedInputToken, 'eip155')}
                    />
                  </>
                ) : (
                  <QuoteList
                    quotes={quotes}
                    errors={errors}
                    status={quoteStatus}
                    inputTokenAddress={selectedInputToken}
                    outputTokenAddress={selectedOutputToken}
                    inputChainId={inputChainId}
                    outputChainId={outputChainId}
                    selectedQuoteId={selectedQuote?.quoteId}
                    executionState={executionState}
                    onSelectQuote={handleSelectQuote}
                    onExecuteQuote={handleExecuteQuote}
                    onRetry={lastQuoteParams ? () => fetchQuotes(lastQuoteParams) : undefined}
                  />
                )}
              </div>
            </div>
          </div>

          <Footer />
        </div>

        {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
      </div>
    </TooltipProvider>
  );
}
