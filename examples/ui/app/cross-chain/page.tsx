'use client';

import { useState, useCallback } from 'react';
import { Footer, Navigation } from '../components';
import {
  IntentTracking,
  QuoteCard,
  QuoteDetails,
  QuoteList,
  SwapForm,
  Toast,
  TooltipProvider,
  type ToastType,
} from './components';
import { useIntentExecution } from './hooks';
import { useQuotes } from './hooks/useQuotes';
import { EXECUTION_STATUS } from './types/execution';
import type { ExecutableQuote } from '@wonderland/interop-cross-chain';
import type { Address } from 'viem';

interface ToastState {
  message: string;
  type: ToastType;
}

export default function CrossChainPage() {
  const { quotes, errors, isLoading, fetchQuotes, clearQuotes } = useQuotes();
  const { state: executionState, execute, reset: resetExecution } = useIntentExecution();

  const [selectedInputToken, setSelectedInputToken] = useState<string>('');
  const [selectedOutputToken, setSelectedOutputToken] = useState<string>('');
  const [selectedQuote, setSelectedQuote] = useState<ExecutableQuote | null>(null);
  const [inputAmountRaw, setInputAmountRaw] = useState<bigint>(0n);
  const [inputChainId, setInputChainId] = useState<number>(0);
  const [outputChainId, setOutputChainId] = useState<number>(0);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Determine if we're in "tracking mode" (execution started)
  const isInTrackingMode = executionState.status !== EXECUTION_STATUS.IDLE;

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
    resetExecution();
    await fetchQuotes(params);
  };

  const handleSelectQuote = (quote: ExecutableQuote) => {
    setSelectedQuote(quote);
    resetExecution();
  };

  const handleExecuteQuote = async (quote: ExecutableQuote) => {
    const result = await execute(quote, selectedInputToken as Address, inputAmountRaw, inputChainId, outputChainId);
    if (result.userRejected) {
      setToast({ message: 'Transaction rejected', type: 'info' });
    }
  };

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
            <header className='flex flex-col items-center gap-4 text-center'>
              <div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-light text-accent text-xs font-medium'>
                EIP-7683 & Intents
              </div>
              <h1 className='text-4xl sm:text-5xl md:text-6xl font-bold text-text-primary'>Cross-Chain Intent Swap</h1>
              <p className='text-lg sm:text-xl text-text-secondary'>
                Experience seamless cross-chain transfers with intent-based routing
              </p>
            </header>

            {/* Two-column layout */}
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-8 items-start'>
              {/* Left column: Form and Quote Details */}
              <div className='flex flex-col gap-6'>
                <SwapForm onSubmit={handleSubmit} isLoading={isLoading} isDisabled={isInTrackingMode} />

                {/* Show Quote Details only when not in tracking mode */}
                {selectedQuote && !isInTrackingMode && <QuoteDetails quote={selectedQuote} />}
              </div>

              {/* Right column: Quotes List or Isolated Selected Quote + Tracking */}
              <div className='flex flex-col gap-4'>
                {isInTrackingMode && selectedQuote ? (
                  // Isolated selected quote + tracking during execution
                  <>
                    <div className='rounded-xl border border-border bg-background/50 p-4'>
                      <h3 className='text-sm font-semibold text-text-primary mb-3'>Selected Quote</h3>
                      <QuoteCard
                        quote={selectedQuote}
                        inputTokenAddress={selectedInputToken}
                        outputTokenAddress={selectedOutputToken}
                        isSelected={true}
                        hideExecuteButton={true}
                      />
                    </div>
                    <IntentTracking state={executionState} onReset={handleReset} />
                  </>
                ) : (
                  // Normal quote list
                  <QuoteList
                    quotes={quotes}
                    errors={errors}
                    inputTokenAddress={selectedInputToken}
                    outputTokenAddress={selectedOutputToken}
                    selectedQuoteId={selectedQuote?.quoteId}
                    executionStatus={EXECUTION_STATUS.IDLE}
                    isLoading={isLoading}
                    onSelectQuote={handleSelectQuote}
                    onExecuteQuote={handleExecuteQuote}
                  />
                )}
              </div>
            </div>
          </div>

          <Footer />
        </div>

        {/* Toast notifications */}
        {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
      </div>
    </TooltipProvider>
  );
}
