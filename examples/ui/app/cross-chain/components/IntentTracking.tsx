'use client';

import { EXECUTION_STATUS, type IntentExecutionState, type IntentExecutionStatus } from '../types/execution';

interface IntentTrackingProps {
  state: IntentExecutionState;
  onReset?: () => void;
}

/**
 * Visual steps for the intent execution flow
 */
const STEPS = [
  {
    id: 'approval',
    label: 'Approval',
    statuses: [EXECUTION_STATUS.CHECKING_APPROVAL, EXECUTION_STATUS.APPROVING] as IntentExecutionStatus[],
  },
  {
    id: 'submit',
    label: 'Submit',
    statuses: [EXECUTION_STATUS.SUBMITTING, EXECUTION_STATUS.CONFIRMING] as IntentExecutionStatus[],
  },
  {
    id: 'opening',
    label: 'Opening',
    statuses: [EXECUTION_STATUS.OPENING, EXECUTION_STATUS.OPENED] as IntentExecutionStatus[],
  },
  {
    id: 'filling',
    label: 'Filling',
    statuses: [EXECUTION_STATUS.FILLING] as IntentExecutionStatus[],
  },
];

/**
 * Get step status based on current execution status
 */
function getStepStatus(
  stepStatuses: IntentExecutionStatus[],
  currentStatus: IntentExecutionStatus,
  stepIndex: number,
): 'pending' | 'active' | 'complete' | 'error' {
  // Error state - mark current step as error
  if (currentStatus === EXECUTION_STATUS.ERROR) {
    const currentStepIndex = STEPS.findIndex((s) => s.statuses.includes(currentStatus));
    if (stepIndex === currentStepIndex || (currentStepIndex === -1 && stepIndex === 0)) {
      return 'error';
    }
  }

  // Expired is treated as error on the filling step
  if (currentStatus === EXECUTION_STATUS.EXPIRED && stepStatuses.includes(EXECUTION_STATUS.FILLING)) {
    return 'error';
  }

  // Check if this step is active
  if (stepStatuses.includes(currentStatus)) {
    return 'active';
  }

  // Check if step is complete (any later step is active or complete)
  const currentStepIndex = STEPS.findIndex(
    (s) =>
      s.statuses.includes(currentStatus) ||
      currentStatus === EXECUTION_STATUS.FILLED ||
      currentStatus === EXECUTION_STATUS.EXPIRED,
  );

  if (currentStepIndex > stepIndex) {
    return 'complete';
  }

  return 'pending';
}

/**
 * Spinner icon component
 */
function SpinnerIcon() {
  return (
    <svg className='w-4 h-4 animate-spin text-accent' fill='none' viewBox='0 0 24 24'>
      <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
      <path
        className='opacity-75'
        fill='currentColor'
        d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
      />
    </svg>
  );
}

/**
 * Check icon component
 */
function CheckIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
    </svg>
  );
}

/**
 * Error icon component
 */
function ErrorIcon() {
  return (
    <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
    </svg>
  );
}

/**
 * External link icon component
 */
function ExternalLinkIcon() {
  return (
    <svg className='w-5 h-5 shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth={2}
        d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14'
      />
    </svg>
  );
}

/**
 * Step indicator component
 */
function StepIndicator({ status }: { status: 'pending' | 'active' | 'complete' | 'error' }) {
  const baseClasses = 'w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all';

  switch (status) {
    case 'active':
      return (
        <div className={`${baseClasses} bg-accent/20 border-2 border-accent`}>
          <SpinnerIcon />
        </div>
      );
    case 'complete':
      return (
        <div className={`${baseClasses} bg-accent text-white`}>
          <CheckIcon />
        </div>
      );
    case 'error':
      return (
        <div className={`${baseClasses} bg-red-500 text-white`}>
          <ErrorIcon />
        </div>
      );
    default:
      return <div className={`${baseClasses} bg-surface-secondary border-2 border-border`} />;
  }
}

/**
 * Success view component - shown when intent is filled
 */
function SuccessView({ state, onReset }: IntentTrackingProps) {
  return (
    <div className='p-4 sm:p-6 rounded-xl border border-accent/30 bg-accent/5'>
      {/* Success header */}
      <div className='flex items-start gap-3 mb-4'>
        <div className='w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-accent flex items-center justify-center shrink-0'>
          <CheckIcon className='w-5 h-5 sm:w-6 sm:h-6 text-white' />
        </div>
        <div className='min-w-0'>
          <h3 className='text-base sm:text-lg font-semibold text-accent'>Intent Filled Successfully!</h3>
          <p className='text-xs sm:text-sm text-text-secondary break-words'>{state.message}</p>
        </div>
      </div>

      {/* Transaction links */}
      <div className='space-y-2 mb-4'>
        {state.txHash && (
          <a
            href={`https://sepolia.etherscan.io/tx/${state.txHash}`}
            target='_blank'
            rel='noopener noreferrer'
            className='block p-3 rounded-lg bg-surface border border-border hover:border-accent/50 transition-colors group'
          >
            <div className='flex items-center justify-between mb-1'>
              <div className='flex items-center gap-2'>
                <div className='w-2 h-2 rounded-full bg-accent/60' />
                <span className='text-sm font-medium text-text-primary'>Origin</span>
              </div>
              <span className='text-xs text-text-tertiary'>Ethereum Sepolia</span>
            </div>
            <div className='flex items-center justify-between text-text-tertiary group-hover:text-accent'>
              <span className='text-sm font-mono'>
                {state.txHash.slice(0, 10)}...{state.txHash.slice(-8)}
              </span>
              <ExternalLinkIcon />
            </div>
          </a>
        )}
        {state.fillTxHash && (
          <a
            href={`https://sepolia.basescan.org/tx/${state.fillTxHash}`}
            target='_blank'
            rel='noopener noreferrer'
            className='block p-3 rounded-lg bg-surface border border-border hover:border-accent/50 transition-colors group'
          >
            <div className='flex items-center justify-between mb-1'>
              <div className='flex items-center gap-2'>
                <div className='w-2 h-2 rounded-full bg-accent' />
                <span className='text-sm font-medium text-text-primary'>Fill</span>
              </div>
              <span className='text-xs text-text-tertiary'>Base Sepolia</span>
            </div>
            <div className='flex items-center justify-between text-text-tertiary group-hover:text-accent'>
              <span className='text-sm font-mono'>
                {state.fillTxHash.slice(0, 10)}...{state.fillTxHash.slice(-8)}
              </span>
              <ExternalLinkIcon />
            </div>
          </a>
        )}
      </div>

      {/* Raw fill event data */}
      <details className='mb-4'>
        <summary className='cursor-pointer text-xs text-text-tertiary hover:text-text-secondary transition-colors'>
          View raw intent data
        </summary>
        <div className='mt-2 p-3 rounded-lg bg-surface-secondary border border-border font-mono text-xs overflow-x-auto'>
          <pre className='text-text-secondary whitespace-pre-wrap break-all'>
            {JSON.stringify(
              {
                status: state.status,
                orderId: state.orderId,
                originTxHash: state.txHash,
                fillTxHash: state.fillTxHash,
              },
              null,
              2,
            )}
          </pre>
        </div>
      </details>

      {/* Close button */}
      {onReset && (
        <button
          type='button'
          onClick={onReset}
          className='w-full py-3 px-4 text-sm font-medium rounded-lg bg-accent hover:bg-accent/90 text-white transition-colors'
        >
          Start New Intent
        </button>
      )}
    </div>
  );
}

/**
 * Error/Expired view component
 */
function ErrorView({ state, onReset }: IntentTrackingProps) {
  const isExpired = state.status === EXECUTION_STATUS.EXPIRED;

  return (
    <div className='p-6 rounded-xl border border-red-500/30 bg-red-500/5'>
      {/* Error header */}
      <div className='flex items-center gap-3 mb-4'>
        <div className='w-12 h-12 rounded-full bg-red-500 flex items-center justify-center'>
          <ErrorIcon />
        </div>
        <div>
          <h3 className='text-lg font-semibold text-red-400'>{isExpired ? 'Intent Expired' : 'Intent Failed'}</h3>
          <p className='text-sm text-text-secondary'>{state.message}</p>
        </div>
      </div>

      {/* Transaction link if available */}
      {state.txHash && (
        <a
          href={`https://sepolia.etherscan.io/tx/${state.txHash}`}
          target='_blank'
          rel='noopener noreferrer'
          className='flex items-center justify-between p-3 rounded-lg bg-surface border border-border hover:border-accent/50 transition-colors group mb-4'
        >
          <div className='flex items-center gap-2'>
            <div className='w-2 h-2 rounded-full bg-blue-400' />
            <span className='text-sm text-text-primary'>Origin Transaction</span>
          </div>
          <div className='flex items-center gap-2 text-text-tertiary group-hover:text-accent'>
            <span className='text-xs font-mono'>
              {state.txHash.slice(0, 10)}...{state.txHash.slice(-8)}
            </span>
            <ExternalLinkIcon />
          </div>
        </a>
      )}

      {/* Try again button */}
      {onReset && (
        <button
          type='button'
          onClick={onReset}
          className='w-full py-3 px-4 text-sm font-medium rounded-lg border border-red-500/50 hover:bg-red-500/10 text-red-400 transition-colors'
        >
          Try Again
        </button>
      )}
    </div>
  );
}

/**
 * Progress view component - shown during execution
 */
function ProgressView({ state }: { state: IntentExecutionState }) {
  return (
    <div className='p-4 rounded-xl border border-border bg-surface'>
      <h3 className='text-sm font-semibold text-text-primary mb-4'>Intent Progress</h3>

      {/* Progress stepper */}
      <div className='space-y-3'>
        {STEPS.map((step, index) => {
          const stepStatus = getStepStatus(step.statuses, state.status, index);
          const isLast = index === STEPS.length - 1;

          return (
            <div key={step.id} className='flex items-start gap-3'>
              {/* Step indicator with connector line */}
              <div className='flex flex-col items-center'>
                <StepIndicator status={stepStatus} />
                {!isLast && (
                  <div
                    className={`w-0.5 h-6 mt-1 transition-colors ${
                      stepStatus === 'complete' ? 'bg-accent' : 'bg-border'
                    }`}
                  />
                )}
              </div>

              {/* Step content */}
              <div className='flex-1 min-w-0 pb-2'>
                <p
                  className={`text-sm font-medium ${
                    stepStatus === 'active'
                      ? 'text-accent'
                      : stepStatus === 'complete'
                        ? 'text-accent'
                        : stepStatus === 'error'
                          ? 'text-red-500'
                          : 'text-text-tertiary'
                  }`}
                >
                  {step.label}
                </p>
                {stepStatus === 'active' && state.message && (
                  <p className='text-xs text-text-secondary mt-0.5 truncate'>{state.message}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Transaction link during progress */}
      {state.txHash && (
        <div className='mt-4 pt-3 border-t border-border'>
          <a
            href={`https://sepolia.etherscan.io/tx/${state.txHash}`}
            target='_blank'
            rel='noopener noreferrer'
            className='text-xs text-accent hover:underline flex items-center gap-1'
          >
            <span>View origin transaction</span>
            <ExternalLinkIcon />
          </a>
        </div>
      )}
    </div>
  );
}

/**
 * Intent tracking progress component
 * Shows different views based on the intent execution state
 */
export function IntentTracking({ state, onReset }: IntentTrackingProps) {
  const isComplete = state.status === EXECUTION_STATUS.FILLED;
  const isError = state.status === EXECUTION_STATUS.ERROR || state.status === EXECUTION_STATUS.EXPIRED;

  // Show success view when filled
  if (isComplete) {
    return <SuccessView state={state} onReset={onReset} />;
  }

  // Show error view when failed or expired
  if (isError) {
    return <ErrorView state={state} onReset={onReset} />;
  }

  // Show progress view during execution
  return <ProgressView state={state} />;
}
