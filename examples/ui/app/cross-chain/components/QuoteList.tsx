'use client';

import { EXECUTION_STATUS, type OrderExecutionStatus } from '../types/execution';
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
  executionStatus?: OrderExecutionStatus;
  isLoading?: boolean;
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

function QuoteSkeleton() {
  return (
    <div className='p-3 rounded-lg border border-border bg-surface animate-pulse'>
      <div className='flex items-start justify-between gap-3 mb-2'>
        <div className='flex-1 min-w-0'>
          <div className='h-7 w-32 bg-border rounded mb-1' />
          <div className='h-3 w-24 bg-border rounded' />
        </div>
        <div className='flex flex-col items-end gap-1.5 shrink-0'>
          <div className='h-4 w-16 bg-border rounded' />
          <div className='h-4 w-20 bg-border rounded' />
        </div>
      </div>
      <div className='flex items-center gap-2 pt-2 border-t border-border/50'>
        <div className='w-6 h-6 rounded-full bg-border' />
        <div className='h-3 w-16 bg-border rounded' />
      </div>
    </div>
  );
}

function QuoteListLoading() {
  return (
    <div data-testid='quotes-loading' className='p-3 pb-6 flex flex-col gap-4'>
      <QuoteSkeleton />
      <QuoteSkeleton />
      <QuoteSkeleton />
    </div>
  );
}

function QuoteListWrapper({ children, errors }: { children: React.ReactNode; errors: ErrorItem[] }) {
  return (
    <div className='flex flex-col gap-3'>
      {/* Quotes section - fixed height with scroll, wrapped in a bordered container */}
      <div className='h-[70vh] border border-border rounded-xl overflow-hidden bg-background'>
        <div className='h-full overflow-y-auto overscroll-contain scrollbar-custom'>{children}</div>
      </div>
      {/* Error list at the bottom - independent height */}
      <ErrorList errors={errors} />
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
  isLoading = false,
  onSelectQuote,
  onExecuteQuote,
}: QuoteListProps) {
  if (isLoading) {
    return (
      <QuoteListWrapper errors={errors}>
        <QuoteListLoading />
      </QuoteListWrapper>
    );
  }

  if (quotes.length === 0) {
    return (
      <QuoteListWrapper errors={errors}>
        <QuotePlaceholder />
      </QuoteListWrapper>
    );
  }

  return (
    <QuoteListWrapper errors={errors}>
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
    </QuoteListWrapper>
  );
}
