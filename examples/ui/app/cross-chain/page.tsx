'use client';

import { useState } from 'react';
import { Footer, Navigation } from '../components';
import { QuoteList, SwapForm } from './components';
import { useQuotes } from './hooks/useQuotes';

export default function CrossChainPage() {
  const { quotes, errors, isLoading, fetchQuotes } = useQuotes();
  const [selectedInputToken, setSelectedInputToken] = useState<string>('');
  const [selectedOutputToken, setSelectedOutputToken] = useState<string>('');

  const handleSubmit = async (params: {
    sender: string;
    recipient: string;
    inputChainId: number;
    outputChainId: number;
    inputTokenAddress: string;
    outputTokenAddress: string;
    inputAmount: string;
  }) => {
    setSelectedInputToken(params.inputTokenAddress);
    setSelectedOutputToken(params.outputTokenAddress);
    await fetchQuotes(params);
  };

  const handleSelectQuote = (quote: (typeof quotes)[0]) => {
    console.log('Selected quote:', quote);
    // TODO: Handle quote selection in next step
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
            {/* Left column: Form */}
            <div className='flex flex-col gap-6'>
              <SwapForm onSubmit={handleSubmit} isLoading={isLoading} />
            </div>

            {/* Right column: Quotes List and Errors */}
            <div className='flex flex-col'>
              <QuoteList
                quotes={quotes}
                errors={errors}
                inputTokenAddress={selectedInputToken}
                outputTokenAddress={selectedOutputToken}
                onSelectQuote={handleSelectQuote}
              />
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
}
