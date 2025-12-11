'use client';

import { useState } from 'react';
import { Footer, Navigation } from '../components';
import { SwapForm } from './components';

export default function CrossChainPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (params: {
    sender: string;
    recipient: string;
    inputChainId: number;
    outputChainId: number;
    inputTokenAddress: string;
    outputTokenAddress: string;
    inputAmount: string;
  }) => {
    setIsLoading(true);
    // TODO: Implement quote fetching in next step
    console.log('Form submitted with params:', params);
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className='min-h-screen bg-background flex flex-col'>
      <Navigation />

      <div className='flex-1 flex flex-col max-w-5xl w-full mx-auto px-4 py-12 sm:px-6 sm:py-16'>
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

          <SwapForm onSubmit={handleSubmit} isLoading={isLoading} />
        </div>

        <Footer />
      </div>
    </div>
  );
}
