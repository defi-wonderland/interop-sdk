import { ORDER_STEPS, getStepStatus } from '../../utils/orderTrackingHelpers';
import { ExternalLinkIcon } from '../icons';
import { StepIndicator } from './StepIndicator';
import type { OrderExecutionState } from '../../types/execution';

export function ProgressView({ state }: { state: OrderExecutionState }) {
  return (
    <div className='p-4 rounded-xl border border-border bg-surface'>
      <h3 className='text-sm font-semibold text-text-primary mb-4'>Order Progress</h3>

      <div className='space-y-3'>
        {ORDER_STEPS.map((step, index) => {
          const stepStatus = getStepStatus(step.statuses, state.status, index);
          const isLast = index === ORDER_STEPS.length - 1;

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
                          ? 'text-error'
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
