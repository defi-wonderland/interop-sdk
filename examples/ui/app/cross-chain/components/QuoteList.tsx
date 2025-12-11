'use client';

import { QuoteCard } from './QuoteCard';
import type { ExecutableQuote } from '@wonderland/interop-cross-chain';

interface QuoteListProps {
  quotes: ExecutableQuote[];
  inputTokenAddress: string;
  outputTokenAddress: string;
  onSelectQuote?: (quote: ExecutableQuote) => void;
}

function QuotePlaceholder() {
  return (
    <div className='flex flex-col items-center justify-center py-12 px-6 text-center h-full bg-[#131b2e] border border-border/50 rounded-xl'>
      <div className='w-16 h-16 rounded-full bg-accent-light/20 flex items-center justify-center mb-4'>
        <svg className='w-8 h-8 text-accent' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4'
          />
        </svg>
      </div>
      <h3 className='text-lg font-semibold text-text-primary mb-2'>Available Quotes</h3>
      <p className='text-sm text-text-secondary max-w-sm'>
        Enter your swap details and click &apos;Get Quotes&apos; to see available cross-chain routes from different
        providers.
      </p>
      <div className='mt-6 flex flex-col gap-2 text-xs text-text-tertiary'>
        <div className='flex items-center gap-2'>
          <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 10V3L4 14h7v7l9-11h-7z' />
          </svg>
          <span>Compare rates and fees</span>
        </div>
        <div className='flex items-center gap-2'>
          <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
            />
          </svg>
          <span>Fast settlement times</span>
        </div>
      </div>
    </div>
  );
}

export function QuoteList({ quotes, inputTokenAddress, outputTokenAddress, onSelectQuote }: QuoteListProps) {
  return (
    <div className='flex flex-col gap-3 h-full'>
      {quotes.length === 0 ? (
        <QuotePlaceholder />
      ) : (
        <>
          <h3 className='text-lg font-semibold text-text-primary'>Available Quotes</h3>
          <div className='flex flex-col gap-2'>
            {quotes.map((quote, index) => (
              <QuoteCard
                key={index}
                quote={quote}
                inputTokenAddress={inputTokenAddress}
                outputTokenAddress={outputTokenAddress}
                onSelect={onSelectQuote}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
