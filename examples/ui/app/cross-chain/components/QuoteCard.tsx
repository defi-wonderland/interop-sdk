'use client';

import { NOT_AVAILABLE } from '../constants';
import { EXECUTION_STATUS, type IntentExecutionStatus } from '../types/execution';
import { formatQuoteData } from '../utils/quoteFormatter';
import { Tooltip } from './Tooltip';
import { SpinnerIcon, CheckIcon, CloseIcon, BoltIcon, ClockIcon, QuestionIcon } from './icons';
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
    switch (executionStatus) {
      case EXECUTION_STATUS.CHECKING_APPROVAL:
        return (
          <>
            <SpinnerIcon />
            <span>Checking...</span>
          </>
        );
      case EXECUTION_STATUS.APPROVING:
        return (
          <>
            <SpinnerIcon />
            <span>Approving...</span>
          </>
        );
      case EXECUTION_STATUS.SUBMITTING:
        return (
          <>
            <SpinnerIcon />
            <span>Confirm...</span>
          </>
        );
      case EXECUTION_STATUS.CONFIRMING:
        return (
          <>
            <SpinnerIcon />
            <span>Pending...</span>
          </>
        );
      case EXECUTION_STATUS.FILLED:
        return (
          <>
            <CheckIcon />
            <span>Sent!</span>
          </>
        );
      case EXECUTION_STATUS.ERROR:
        return (
          <>
            <CloseIcon />
            <span>Failed</span>
          </>
        );
      default:
        return (
          <>
            <BoltIcon />
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
                <ClockIcon className='w-3.5 h-3.5 shrink-0' />
                <span>{formatted.eta}</span>
              </div>
            )}

            {/* Cost: Fee + Gas (prefer USD display for consistency) */}
            {(hasFee || hasGas || gasUnknown) && (
              <div className='flex items-center gap-1.5 text-xs text-text-tertiary'>
                <BoltIcon className='w-3.5 h-3.5 shrink-0' />
                <span className='text-right'>
                  {useUsdDisplay ? (
                    <>
                      {/* USD display: cleaner for users */}
                      {hasFeeUsd && <>{formatted.feeTotalUsd} fee</>}
                      {hasFeeUsd && (hasGasUsd || gasUnknown) && ' + '}
                      {hasGasUsd && <>{formatted.originGasUsd} gas</>}
                      {gasUnknown && !hasGasUsd && (
                        <Tooltip content='Gas estimated after approval' side='top' align='end'>
                          <span className='inline-flex items-center gap-0.5 cursor-help'>
                            <span>gas TBD</span>
                            <QuestionIcon className='w-3 h-3' />
                          </span>
                        </Tooltip>
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
                        <Tooltip content='Gas estimated after approval' side='top' align='end'>
                          <span className='inline-flex items-center gap-0.5 cursor-help'>
                            <span>gas TBD</span>
                            <QuestionIcon className='w-3 h-3' />
                          </span>
                        </Tooltip>
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
