'use client';

import { EXECUTION_STATUS, type IntentExecutionStatus } from '../types/execution';
import { ErrorList } from './ErrorList';
import { QuoteCard } from './QuoteCard';
import { SwapIcon, BoltIcon, ClockIcon } from './icons';
import type { ExecutableQuote } from '@wonderland/interop-cross-chain';

interface ErrorItem {
  errorMsg: string;
  error: Error;
}

interface QuoteListProps {
  quotes: ExecutableQuote[];
  errors: ErrorItem[];
  inputTokenAddress: string;
  outputTokenAddress: string;
  selectedQuoteId?: string;
  executionStatus?: IntentExecutionStatus;
  onSelectQuote?: (quote: ExecutableQuote) => void;
  onExecuteQuote?: (quote: ExecutableQuote) => void;
}

function QuotePlaceholder() {
  return (
    <div className='flex flex-col items-center justify-center py-12 px-6 text-center h-full'>
      <div className='w-16 h-16 rounded-full bg-accent-light/20 flex items-center justify-center mb-4'>
        <SwapIcon className='w-8 h-8 text-accent' />
      </div>
      <h3 className='text-lg font-semibold text-text-primary mb-2'>Available Quotes</h3>
      <p className='text-sm text-text-secondary max-w-sm'>
        Enter your swap details and click &apos;Get Quotes&apos; to see available cross-chain routes from different
        providers.
      </p>
      <div className='mt-6 flex flex-col gap-2 text-xs text-text-tertiary'>
        <div className='flex items-center gap-2'>
          <BoltIcon />
          <span>Compare rates and fees</span>
        </div>
        <div className='flex items-center gap-2'>
          <ClockIcon />
          <span>Fast settlement times</span>
        </div>
      </div>
    </div>
  );
}

export function QuoteList({
  quotes,
  errors,
  inputTokenAddress,
  outputTokenAddress,
  selectedQuoteId,
  executionStatus,
  onSelectQuote,
  onExecuteQuote,
}: QuoteListProps) {
  return (
    <div className='flex flex-col gap-3'>
      {/* Quotes section - fixed height with scroll, wrapped in a bordered container */}
      <div className='h-[70vh] border border-border rounded-xl overflow-hidden bg-background'>
        <div className='h-full overflow-y-auto overscroll-contain scrollbar-custom'>
          {quotes.length === 0 ? (
            <QuotePlaceholder />
          ) : (
            <div className='p-3 pb-6 flex flex-col gap-4'>
              {quotes.map((quote, index) => (
                <QuoteCard
                  key={quote.quoteId || index}
                  quote={quote}
                  inputTokenAddress={inputTokenAddress}
                  outputTokenAddress={outputTokenAddress}
                  isSelected={selectedQuoteId === quote.quoteId}
                  executionStatus={selectedQuoteId === quote.quoteId ? executionStatus : EXECUTION_STATUS.IDLE}
                  onSelect={onSelectQuote}
                  onExecute={onExecuteQuote}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Error list at the bottom - independent height */}
      <ErrorList errors={errors} />
    </div>
  );
}
