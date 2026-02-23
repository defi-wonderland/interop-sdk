'use client';

import { NOT_AVAILABLE } from '../constants';
import { useChainConfig, useTokenConfig } from '../hooks/useNetworkConfig';
import { STEP, WALLET_ACTION, type BridgeState } from '../types/execution';
import { formatQuoteData } from '../utils/quoteFormatter';
import { Tooltip } from './Tooltip';
import { SpinnerIcon, CheckIcon, CloseIcon, BoltIcon, ClockIcon, QuestionIcon } from './icons';
import type { ExecutableQuote } from '@wonderland/interop-cross-chain';

interface QuoteCardProps {
  quote: ExecutableQuote;
  inputTokenAddress: string;
  outputTokenAddress: string;
  inputChainId: number;
  outputChainId: number;
  isSelected?: boolean;
  executionState?: BridgeState;
  hideExecuteButton?: boolean;
  onSelect?: (quote: ExecutableQuote) => void;
  onExecute?: (quote: ExecutableQuote) => void;
}

function ArrowIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 7l5 5m0 0l-5 5m5-5H6' />
    </svg>
  );
}

function ChainPill({ name }: { name: string }) {
  return (
    <span className='inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface-secondary/80 text-[10px] font-medium text-text-tertiary leading-none'>
      {name}
    </span>
  );
}

function TokenAmount({
  amount,
  symbol,
  chainName,
  variant,
}: {
  amount: string;
  symbol: string;
  chainName: string;
  variant: 'input' | 'output';
}) {
  const isOutput = variant === 'output';
  return (
    <div className={`flex flex-col ${isOutput ? 'items-end' : 'items-start'}`}>
      <div className='flex items-baseline gap-1.5'>
        <span
          className={`tabular-nums font-semibold ${isOutput ? 'text-base text-text-primary' : 'text-sm text-text-secondary'}`}
        >
          {amount}
        </span>
        <span className={`font-medium ${isOutput ? 'text-sm text-text-primary' : 'text-xs text-text-tertiary'}`}>
          {symbol}
        </span>
      </div>
      <ChainPill name={chainName} />
    </div>
  );
}

export function QuoteCard({
  quote,
  inputTokenAddress,
  outputTokenAddress,
  inputChainId,
  outputChainId,
  isSelected,
  executionState,
  hideExecuteButton = false,
  onSelect,
  onExecute,
}: QuoteCardProps) {
  const tokenConfig = useTokenConfig();
  const { getChain } = useChainConfig();
  const inputChainName = getChain(inputChainId)?.name ?? `Chain ${inputChainId}`;
  const outputChainName = getChain(outputChainId)?.name ?? `Chain ${outputChainId}`;
  const formatted = formatQuoteData(
    quote,
    inputTokenAddress,
    outputTokenAddress,
    inputChainId,
    outputChainId,
    tokenConfig.TOKEN_INFO,
  );

  const handleClick = () => {
    onSelect?.(quote);
  };

  const handleExecuteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering onSelect
    onExecute?.(quote);
  };

  const hasFee = !!formatted.feeTotal && formatted.feeTotal !== '0.0000';
  const hasFeeUsd = !!formatted.feeTotalUsd;
  const hasGas = !!formatted.hasOriginGas; // Use the flag that checks raw value, not formatted
  const hasGasUsd = !!formatted.originGasUsd;
  const gasUnknown = formatted.gasSimulationFailed;
  const useUsdDisplay = hasFeeUsd || hasGasUsd;
  const showEta = formatted.eta !== NOT_AVAILABLE;
  const showCost = hasFee || hasGas || gasUnknown;
  const showExecuteButton = isSelected && !hideExecuteButton;

  const baseClasses = 'p-3 rounded-xl border transition-all text-left w-full';
  const selectedClasses = isSelected
    ? 'border-accent/60 bg-accent/[0.04] ring-1 ring-accent/40'
    : 'border-border/60 bg-surface/60 hover:bg-surface-secondary/40 hover:border-border-focus/60';

  // Execute button content based on state
  const getExecuteButtonContent = () => {
    if (!executionState || executionState.step === STEP.IDLE) {
      return (
        <>
          <BoltIcon />
          <span>Execute</span>
        </>
      );
    }

    if (executionState.step === STEP.WALLET) {
      switch (executionState.action) {
        case WALLET_ACTION.CHECKING:
          return (
            <>
              <SpinnerIcon />
              <span>Checking...</span>
            </>
          );
        case WALLET_ACTION.APPROVING:
          return (
            <>
              <SpinnerIcon />
              <span>Approving...</span>
            </>
          );
        case WALLET_ACTION.SUBMITTING:
          return (
            <>
              <SpinnerIcon />
              <span>Confirm...</span>
            </>
          );
        case WALLET_ACTION.CONFIRMING:
          return (
            <>
              <SpinnerIcon />
              <span>Pending...</span>
            </>
          );
        default:
          return (
            <>
              <SpinnerIcon />
              <span>Loading...</span>
            </>
          );
      }
    }

    if (executionState.step === STEP.DONE) {
      return (
        <>
          <CheckIcon />
          <span>Sent!</span>
        </>
      );
    }

    if (executionState.step === STEP.ERROR) {
      return (
        <>
          <CloseIcon />
          <span>Failed</span>
        </>
      );
    }

    // tracking or timeout
    return (
      <>
        <SpinnerIcon />
        <span>Tracking...</span>
      </>
    );
  };

  const isPendingWallet = executionState?.step === STEP.WALLET;
  const isFinished = executionState?.step === STEP.DONE || executionState?.step === STEP.ERROR;

  // Button styling: darker when loading, normal otherwise (no green for success)
  const executeButtonClasses = isPendingWallet
    ? 'bg-surface-secondary text-text-primary border border-border cursor-wait'
    : 'bg-accent text-white hover:bg-accent-hover';

  return (
    <div className='relative'>
      <button type='button' onClick={handleClick} className={`${baseClasses} ${selectedClasses}`}>
        {/* Route: Input → Output */}
        <div className='flex items-center gap-2'>
          <TokenAmount
            amount={formatted.inputAmount}
            symbol={formatted.inputSymbol}
            chainName={inputChainName}
            variant='input'
          />

          <div className='flex-1 flex items-center justify-center'>
            <div className='h-px flex-1 bg-border/40' />
            <ArrowIcon className='w-4 h-4 text-text-tertiary mx-1 shrink-0' />
            <div className='h-px flex-1 bg-border/40' />
          </div>

          <TokenAmount
            amount={formatted.outputAmount}
            symbol={formatted.outputSymbol}
            chainName={outputChainName}
            variant='output'
          />
        </div>

        {/* Footer: Provider | ETA + Fees | (spacer for execute button) */}
        <div
          className={`grid items-center mt-2.5 ${showExecuteButton && !isFinished ? 'grid-cols-[1fr_auto_7rem]' : 'grid-cols-[1fr_auto]'}`}
        >
          <span className='text-[11px] font-medium text-text-tertiary'>{formatted.providerDisplayName}</span>

          <div className='flex items-center gap-3 justify-end'>
            {showEta && (
              <div className='flex items-center gap-1 text-[11px] text-text-tertiary'>
                <ClockIcon className='w-3 h-3 shrink-0' />
                <span>{formatted.eta}</span>
              </div>
            )}

            {showCost && (
              <>
                {/* Compact cost for small screens */}
                <div className='flex sm:hidden items-center gap-1 text-[11px] text-text-tertiary'>
                  <BoltIcon className='w-3 h-3 shrink-0' />
                  <span>{formatted.costCompact}</span>
                </div>

                {/* Full cost for wider screens */}
                <div className='hidden sm:flex items-center gap-1 text-[11px] text-text-tertiary'>
                  <BoltIcon className='w-3 h-3 shrink-0' />
                  <span>
                    {useUsdDisplay ? (
                      <>
                        {hasFeeUsd && <>{formatted.feeTotalUsd}</>}
                        {hasFeeUsd && (hasGasUsd || gasUnknown) && ' + '}
                        {hasGasUsd && <>{formatted.originGasUsd}</>}
                        {gasUnknown && !hasGasUsd && (
                          <Tooltip content='Gas estimated after approval' side='top' align='end'>
                            <span className='inline-flex items-center gap-0.5 cursor-help'>
                              gas TBD
                              <QuestionIcon className='w-2.5 h-2.5' />
                            </span>
                          </Tooltip>
                        )}
                      </>
                    ) : (
                      <>
                        {hasFee && (
                          <>
                            {formatted.feeTotal} {formatted.feeTokenSymbol || formatted.inputSymbol}
                          </>
                        )}
                        {hasFee && (hasGas || gasUnknown) && ' + '}
                        {hasGas && (
                          <>
                            {formatted.originGas} {formatted.originGasSymbol}
                          </>
                        )}
                        {gasUnknown && !hasGas && (
                          <Tooltip content='Gas estimated after approval' side='top' align='end'>
                            <span className='inline-flex items-center gap-0.5 cursor-help'>
                              gas TBD
                              <QuestionIcon className='w-2.5 h-2.5' />
                            </span>
                          </Tooltip>
                        )}
                      </>
                    )}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Spacer for execute button on mobile */}
          {showExecuteButton && !isFinished && <div className='sm:hidden' />}
        </div>
      </button>

      {/* Floating Execute Button */}
      {showExecuteButton && !isFinished && (
        <button
          type='button'
          onClick={handleExecuteClick}
          disabled={isPendingWallet}
          className={`absolute -bottom-3 right-3 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium shadow-lg transition-all transform disabled:cursor-wait ${isPendingWallet ? '' : 'hover:scale-105'} ${executeButtonClasses}`}
        >
          {getExecuteButtonContent()}
        </button>
      )}
    </div>
  );
}
