import { getExplorerTxUrl } from '../../constants/chains';
import { STEP } from '../../types/execution';
import { isApprovalPhase, isSubmitPhase, getStateLabel, getProgressMessage } from '../../utils/orderTrackingHelpers';
import { ExternalLinkIcon, SpinnerIcon, CheckIcon } from '../icons';
import type { ProgressViewProps } from './types';

/**
 * Step indicator - simple visual component
 */
function StepIndicator({ isCurrent, isPassed }: { isCurrent: boolean; isPassed: boolean }) {
  const baseClasses = 'w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all';

  if (isCurrent) {
    return (
      <div className={`${baseClasses} bg-accent/20 border-2 border-accent`}>
        <SpinnerIcon />
      </div>
    );
  }
  if (isPassed) {
    return (
      <div className={`${baseClasses} bg-accent text-white`}>
        <CheckIcon />
      </div>
    );
  }
  return <div className={`${baseClasses} bg-surface-secondary border-2 border-border`} />;
}

export function ProgressView({ state }: ProgressViewProps) {
  const message = getProgressMessage(state);
  const originTxUrl = getExplorerTxUrl(state.originChainId, state.txHash);

  // Determine current step index: 0=approval, 1=submit, 2=tracking
  const currentStep = isApprovalPhase(state) ? 0 : isSubmitPhase(state) ? 1 : 2;

  const steps = [
    { id: 'approval', label: 'Approval' },
    { id: 'submit', label: 'Submit' },
    { id: 'tracking', label: state.step === STEP.TRACKING ? getStateLabel(state) : 'Tracking' },
  ].map((step, i) => ({ ...step, isCurrent: i === currentStep, isPassed: i < currentStep }));

  return (
    <div className='p-4 rounded-xl border border-border bg-surface'>
      <h3 className='text-sm font-semibold text-text-primary mb-4'>Order Progress</h3>

      <div className='space-y-3'>
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;

          return (
            <div key={step.id} className='flex items-start gap-3'>
              {/* Step indicator with connector line */}
              <div className='flex flex-col items-center'>
                <StepIndicator isCurrent={step.isCurrent} isPassed={step.isPassed} />
                {!isLast && (
                  <div className={`w-0.5 h-6 mt-1 transition-colors ${step.isPassed ? 'bg-accent' : 'bg-border'}`} />
                )}
              </div>

              {/* Step content */}
              <div className='flex-1 min-w-0 pb-2'>
                <p
                  className={`text-sm font-medium ${
                    step.isCurrent ? 'text-accent' : step.isPassed ? 'text-accent' : 'text-text-tertiary'
                  }`}
                >
                  {step.label}
                </p>
                {step.isCurrent && message && <p className='text-xs text-text-secondary mt-0.5 truncate'>{message}</p>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Transaction link during progress */}
      {originTxUrl && (
        <div className='mt-4 pt-3 border-t border-border'>
          <a
            href={originTxUrl}
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
