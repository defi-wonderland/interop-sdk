'use client';

import { type IntentExecutionState, type IntentExecutionStatus } from '../hooks/useIntentExecution';

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
    statuses: ['checking-approval', 'approving'] as IntentExecutionStatus[],
  },
  {
    id: 'submit',
    label: 'Submit',
    statuses: ['submitting', 'confirming'] as IntentExecutionStatus[],
  },
  {
    id: 'opening',
    label: 'Opening',
    statuses: ['opening', 'opened'] as IntentExecutionStatus[],
  },
  {
    id: 'filling',
    label: 'Filling',
    statuses: ['filling'] as IntentExecutionStatus[],
  },
  {
    id: 'complete',
    label: 'Complete',
    statuses: ['filled'] as IntentExecutionStatus[],
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
  if (currentStatus === 'error') {
    const currentStepIndex = STEPS.findIndex((s) => s.statuses.includes(currentStatus));
    if (stepIndex === currentStepIndex || (currentStepIndex === -1 && stepIndex === 0)) {
      return 'error';
    }
  }

  // Expired is treated as error on the filling step
  if (currentStatus === 'expired' && stepStatuses.includes('filling')) {
    return 'error';
  }

  // Check if this step is active
  if (stepStatuses.includes(currentStatus)) {
    return 'active';
  }

  // Check if step is complete (any later step is active or complete)
  const currentStepIndex = STEPS.findIndex(
    (s) => s.statuses.includes(currentStatus) || currentStatus === 'filled' || currentStatus === 'expired',
  );

  if (currentStepIndex > stepIndex) {
    return 'complete';
  }

  // Special case: if filled, mark complete step as active
  if (currentStatus === 'filled' && stepStatuses.includes('filled')) {
    return 'active';
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
function CheckIcon() {
  return (
    <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
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
        <div className={`${baseClasses} bg-green-500 text-white`}>
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
 * Intent tracking progress component
 * Shows a visual stepper for the intent execution and tracking flow
 */
export function IntentTracking({ state, onReset }: IntentTrackingProps) {
  const isComplete = state.status === 'filled';
  const isError = state.status === 'error' || state.status === 'expired';
  const showReset = isComplete || isError;

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
                      stepStatus === 'complete' ? 'bg-green-500' : 'bg-border'
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
                        ? 'text-green-500'
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

      {/* Status message area */}
      {state.message && (
        <div
          className={`mt-4 p-3 rounded-lg text-sm ${
            isError
              ? 'bg-red-500/10 border border-red-500/20 text-red-400'
              : isComplete
                ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                : 'bg-accent/10 border border-accent/20 text-text-secondary'
          }`}
        >
          {state.message}
        </div>
      )}

      {/* Transaction links */}
      {state.txHash && (
        <div className='mt-3 flex flex-col gap-1'>
          <a
            href={`https://sepolia.etherscan.io/tx/${state.txHash}`}
            target='_blank'
            rel='noopener noreferrer'
            className='text-xs text-accent hover:underline flex items-center gap-1'
          >
            <span>View origin transaction</span>
            <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14'
              />
            </svg>
          </a>
          {state.fillTxHash && (
            <a
              href={`https://sepolia.basescan.org/tx/${state.fillTxHash}`}
              target='_blank'
              rel='noopener noreferrer'
              className='text-xs text-green-400 hover:underline flex items-center gap-1'
            >
              <span>View fill transaction</span>
              <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14'
                />
              </svg>
            </a>
          )}
        </div>
      )}

      {/* Reset button */}
      {showReset && onReset && (
        <button
          type='button'
          onClick={onReset}
          className='mt-4 w-full py-2 px-4 text-sm font-medium rounded-lg border border-border bg-surface-secondary hover:bg-surface text-text-primary transition-colors'
        >
          {isComplete ? 'New Transfer' : 'Try Again'}
        </button>
      )}
    </div>
  );
}
