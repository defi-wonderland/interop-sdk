'use client';

import { NOT_AVAILABLE } from '../constants';
import { EXECUTION_STATUS, type IntentExecutionStatus } from '../types/execution';
import { formatQuoteData } from '../utils/quoteFormatter';
import type { ExecutableQuote } from '@wonderland/interop-cross-chain';

interface QuoteCardProps {
  quote: ExecutableQuote;
  inputTokenAddress: string;
  outputTokenAddress: string;
  isSelected?: boolean;
  executionStatus?: IntentExecutionStatus;
  hideExecuteButton?: boolean;
  onSelect?: (quote: ExecutableQuote) => void;
  onExecute?: (quote: ExecutableQuote) => void;
}

/**
 * Protocol logo placeholder - circular avatar with provider initial
 */
function ProtocolAvatar({ providerName, size = 'md' }: { providerName: string; size?: 'sm' | 'md' }) {
  const initial = providerName.charAt(0).toUpperCase();
  const sizeClass = size === 'sm' ? 'w-6 h-6 text-xs' : 'w-10 h-10 text-sm';
  return (
    <div
      className={`${sizeClass} rounded-full bg-accent-light flex items-center justify-center text-accent font-semibold shrink-0`}
    >
      {initial}
    </div>
  );
}

export function QuoteCard({
  quote,
  inputTokenAddress,
  outputTokenAddress,
  isSelected,
  executionStatus = EXECUTION_STATUS.IDLE,
  hideExecuteButton = false,
  onSelect,
  onExecute,
}: QuoteCardProps) {
  const formatted = formatQuoteData(quote, inputTokenAddress, outputTokenAddress);

  const handleClick = () => {
    onSelect?.(quote);
  };

  const handleExecuteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering onSelect
    onExecute?.(quote);
  };

  // Build cost display
  const hasFee = !!formatted.feeTotal && formatted.feeTotal !== '0.0000';
  const hasFeeUsd = !!formatted.feeTotalUsd;
  const hasGas = !!formatted.hasOriginGas; // Use the flag that checks raw value, not formatted
  const hasGasUsd = !!formatted.originGasUsd;
  const gasUnknown = formatted.gasSimulationFailed;
  // Prefer USD display when both fee and gas have USD values
  const useUsdDisplay = hasFeeUsd || hasGasUsd;

  const baseClasses = 'p-3 rounded-lg border transition-all text-left w-full';
  const selectedClasses = isSelected
    ? 'border-accent bg-accent-light/10 ring-1 ring-accent'
    : 'border-border bg-surface hover:bg-surface-secondary hover:border-accent';

  // Execute button content based on status
  const getExecuteButtonContent = () => {
    const spinnerIcon = (
      <svg className='w-4 h-4 animate-spin' fill='none' viewBox='0 0 24 24'>
        <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
        <path
          className='opacity-75'
          fill='currentColor'
          d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
        />
      </svg>
    );

    switch (executionStatus) {
      case EXECUTION_STATUS.CHECKING_APPROVAL:
        return (
          <>
            {spinnerIcon}
            <span>Checking...</span>
          </>
        );
      case EXECUTION_STATUS.APPROVING:
        return (
          <>
            {spinnerIcon}
            <span>Approving...</span>
          </>
        );
      case EXECUTION_STATUS.SUBMITTING:
        return (
          <>
            {spinnerIcon}
            <span>Confirm...</span>
          </>
        );
      case EXECUTION_STATUS.CONFIRMING:
        return (
          <>
            {spinnerIcon}
            <span>Pending...</span>
          </>
        );
      case EXECUTION_STATUS.FILLED:
        return (
          <>
            <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
            </svg>
            <span>Sent!</span>
          </>
        );
      case EXECUTION_STATUS.ERROR:
        return (
          <>
            <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
            </svg>
            <span>Failed</span>
          </>
        );
      default:
        return (
          <>
            <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 10V3L4 14h7v7l9-11h-7z' />
            </svg>
            <span>Execute</span>
          </>
        );
    }
  };

  const isExecuting =
    executionStatus === EXECUTION_STATUS.CHECKING_APPROVAL ||
    executionStatus === EXECUTION_STATUS.APPROVING ||
    executionStatus === EXECUTION_STATUS.SUBMITTING ||
    executionStatus === EXECUTION_STATUS.CONFIRMING;

  const isFinished = executionStatus === EXECUTION_STATUS.FILLED || executionStatus === EXECUTION_STATUS.ERROR;

  // Button styling: darker when loading, normal otherwise (no green for success)
  const executeButtonClasses = isExecuting
    ? 'bg-surface-secondary text-text-primary border border-border cursor-wait'
    : 'bg-accent text-white hover:bg-accent-hover';

  return (
    <div className='relative'>
      <button type='button' onClick={handleClick} className={`${baseClasses} ${selectedClasses}`}>
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
          <div className='flex flex-col items-end gap-1.5 shrink-0'>
            {/* ETA */}
            {formatted.eta !== NOT_AVAILABLE && (
              <div className='flex items-center gap-1 text-xs text-text-secondary font-medium'>
                <svg className='w-3.5 h-3.5 shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
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

            {/* Cost: Fee + Gas (prefer USD display for consistency) */}
            {(hasFee || hasGas || gasUnknown) && (
              <div className='flex items-center gap-1.5 text-xs text-text-tertiary'>
                <svg className='w-3.5 h-3.5 shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 10V3L4 14h7v7l9-11h-7z' />
                </svg>
                <span className='text-right'>
                  {useUsdDisplay ? (
                    <>
                      {/* USD display: cleaner for users */}
                      {hasFeeUsd && <>{formatted.feeTotalUsd} fee</>}
                      {hasFeeUsd && (hasGasUsd || gasUnknown) && ' + '}
                      {hasGasUsd && <>{formatted.originGasUsd} gas</>}
                      {gasUnknown && !hasGasUsd && (
                        <span className='inline-flex items-center gap-0.5 group relative'>
                          <span>gas TBD</span>
                          <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth={2}
                              d='M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                            />
                          </svg>
                          <span className='absolute bottom-full right-0 mb-2 px-3 py-2 text-xs text-text-primary bg-surface border border-border rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-20'>
                            Gas estimated after approval
                          </span>
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Token display: fallback when USD not available */}
                      {hasFee && (
                        <>
                          {formatted.feeTotal} {formatted.feeTokenSymbol || formatted.inputSymbol} fee
                        </>
                      )}
                      {hasFee && (hasGas || gasUnknown) && ' + '}
                      {hasGas && (
                        <>
                          {formatted.originGas} {formatted.originGasSymbol} gas
                        </>
                      )}
                      {gasUnknown && !hasGas && (
                        <span className='inline-flex items-center gap-0.5 group relative'>
                          <span>gas TBD</span>
                          <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth={2}
                              d='M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                            />
                          </svg>
                          <span className='absolute bottom-full right-0 mb-2 px-3 py-2 text-xs text-text-primary bg-surface border border-border rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-20'>
                            Gas estimated after approval
                          </span>
                        </span>
                      )}
                    </>
                  )}
                </span>
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

      {/* Floating Execute Button - appears when selected, hides when finished or explicitly hidden */}
      {isSelected && !isFinished && !hideExecuteButton && (
        <button
          type='button'
          onClick={handleExecuteClick}
          disabled={isExecuting}
          className={`absolute -bottom-3 right-3 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium shadow-lg transition-all transform disabled:cursor-wait ${isExecuting ? '' : 'hover:scale-105'} ${executeButtonClasses}`}
        >
          {getExecuteButtonContent()}
        </button>
      )}
    </div>
  );
}
