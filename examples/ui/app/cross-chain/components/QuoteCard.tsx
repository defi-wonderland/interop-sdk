'use client';

import { NOT_AVAILABLE } from '../constants';
import { formatQuoteData } from '../utils/quoteFormatter';
import type { ExecutableQuote } from '@wonderland/interop-cross-chain';

interface QuoteCardProps {
  quote: ExecutableQuote;
  inputTokenAddress: string;
  outputTokenAddress: string;
  onSelect?: (quote: ExecutableQuote) => void;
}

/**
 * Protocol logo placeholder - circular avatar with provider initial
 */
function ProtocolAvatar({ providerName, size = 'md' }: { providerName: string; size?: 'sm' | 'md' }) {
  const initial = providerName.charAt(0).toUpperCase();
  const sizeClass = size === 'sm' ? 'w-6 h-6 text-xs' : 'w-10 h-10 text-sm';
  return (
    <div
      className={`${sizeClass} rounded-full bg-accent-light flex items-center justify-center text-accent font-semibold flex-shrink-0`}
    >
      {initial}
    </div>
  );
}

export function QuoteCard({ quote, inputTokenAddress, outputTokenAddress, onSelect }: QuoteCardProps) {
  const formatted = formatQuoteData(quote, inputTokenAddress, outputTokenAddress);

  const handleClick = () => {
    onSelect?.(quote);
  };

  // Build cost display: Fee + Gas
  const costParts: string[] = [];
  if (formatted.feeTotal) {
    costParts.push(`${formatted.feeTotal} ${formatted.feeTokenSymbol || formatted.inputSymbol}`);
  }
  if (formatted.gas && !formatted.gasSimulationFailed) {
    costParts.push(`${formatted.gas} gas`);
  }
  const costDisplay = formatted.gasSimulationFailed
    ? 'Cost unavailable'
    : costParts.length > 0
      ? costParts.join(' + ')
      : null;

  return (
    <button
      type='button'
      onClick={handleClick}
      className='p-3 rounded-lg border border-border bg-surface hover:bg-surface-secondary hover:border-accent transition-all text-left w-full'
    >
      {/* Top row: Receive (left, prominent) | Time + Fee (right) */}
      <div className='flex items-start justify-between gap-3 mb-2'>
        <div className='flex-1 min-w-0'>
          {/* Receive amount - most prominent */}
          <div className='text-xl font-bold text-text-primary leading-tight mb-0.5'>
            {formatted.outputAmount} {formatted.outputSymbol}
          </div>
          {/* Send amount */}
          <div className='text-xs text-text-tertiary'>
            Send: {formatted.inputAmount} {formatted.inputSymbol}
          </div>
        </div>

        {/* Right: Time and Fee stacked */}
        <div className='flex flex-col items-end gap-1.5 flex-shrink-0'>
          {/* ETA */}
          {formatted.eta !== NOT_AVAILABLE && (
            <div className='flex items-center gap-1 text-xs text-text-secondary font-medium'>
              <svg className='w-3.5 h-3.5 flex-shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
                />
              </svg>
              <span>{formatted.eta}</span>
            </div>
          )}

          {/* Cost: Fee + Gas */}
          {costDisplay && (
            <div className='flex items-center gap-1.5 text-xs text-text-tertiary'>
              <svg className='w-3.5 h-3.5 flex-shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 10V3L4 14h7v7l9-11h-7z' />
              </svg>
              <span className='text-right'>{costDisplay}</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom: Protocol avatar + name (smaller, horizontal) */}
      <div className='flex items-center gap-2 pt-2 border-t border-border/50'>
        <ProtocolAvatar providerName={formatted.providerDisplayName} size='sm' />
        <span className='text-xs font-medium text-text-secondary'>{formatted.providerDisplayName}</span>
      </div>
    </button>
  );
}
