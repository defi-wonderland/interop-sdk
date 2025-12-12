'use client';

import { useState, useEffect, useCallback } from 'react';
import { Footer, Navigation } from '../components';
import { QuoteDetails, QuoteList, SwapForm, Toast, type ToastType } from './components';
import { useExecuteQuote } from './hooks/useExecuteQuote';
import { useQuotes } from './hooks/useQuotes';
import { getToastErrorMessage } from './utils/errorMessages';
import type { ExecutableQuote } from '@wonderland/interop-cross-chain';
import type { Address } from 'viem';

type ExecutionStatus = 'idle' | 'checking-approval' | 'approving' | 'pending' | 'confirming' | 'success' | 'error';

interface ToastState {
  message: string;
  type: ToastType;
}

export default function CrossChainPage() {
  const { quotes, errors, isLoading, fetchQuotes, clearQuotes } = useQuotes();
  const { execute, error, reset, status } = useExecuteQuote();
  const [selectedInputToken, setSelectedInputToken] = useState<string>('');
  const [selectedOutputToken, setSelectedOutputToken] = useState<string>('');
  const [selectedQuote, setSelectedQuote] = useState<ExecutableQuote | null>(null);
  const [inputAmountRaw, setInputAmountRaw] = useState<bigint>(0n);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Handle success: show toast and reset after delay
  useEffect(() => {
    if (status !== 'success') return;

    setToast({ message: 'Transaction sent successfully!', type: 'success' });
    const timer = setTimeout(() => {
      setSelectedQuote(null);
      clearQuotes();
      reset();
    }, 2000);
    return () => clearTimeout(timer);
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle error: show toast and reset after delay
  useEffect(() => {
    if (!error) return;

    setToast({ message: getToastErrorMessage(error), type: 'error' });
    const timer = setTimeout(() => {
      reset();
    }, 3000);
    return () => clearTimeout(timer);
  }, [error]); // eslint-disable-line react-hooks/exhaustive-deps

  const closeToast = useCallback(() => {
    setToast(null);
  }, []);

  // Map hook status to ExecutionStatus (they're now the same type)
  const getExecutionStatus = (): ExecutionStatus => {
    if (error) return 'error';
    return status;
  };

  // Disable form while transaction is in progress
  const isExecuting =
    status === 'checking-approval' || status === 'approving' || status === 'pending' || status === 'confirming';

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
    setSelectedQuote(null); // Clear selection when fetching new quotes
    reset(); // Reset execution state
    await fetchQuotes(params);
  };

  const handleSelectQuote = (quote: ExecutableQuote) => {
    setSelectedQuote(quote);
    reset(); // Reset execution state when selecting new quote
  };

  const handleExecuteQuote = async (quote: ExecutableQuote) => {
    await execute(quote, selectedInputToken as Address, inputAmountRaw);
  };

  return (
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

          {/* Two-column layout: Form on left, Quotes on right */}
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-8 items-start'>
            {/* Left column: Form and Quote Details */}
            <div className='flex flex-col gap-6'>
              <SwapForm onSubmit={handleSubmit} isLoading={isLoading} isDisabled={isExecuting} />
              {selectedQuote && <QuoteDetails quote={selectedQuote} />}
            </div>

            {/* Right column: Quotes List and Errors */}
            <div className='flex flex-col'>
              <QuoteList
                quotes={quotes}
                errors={errors}
                inputTokenAddress={selectedInputToken}
                outputTokenAddress={selectedOutputToken}
                selectedQuoteId={selectedQuote?.quoteId}
                executionStatus={getExecutionStatus()}
                onSelectQuote={handleSelectQuote}
                onExecuteQuote={handleExecuteQuote}
              />
            </div>
          </div>
        </div>

        <Footer />
      </div>

      {/* Toast notifications */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
    </div>
  );
}
