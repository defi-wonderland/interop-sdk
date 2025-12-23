import { EXECUTION_STATUS } from '../../types/execution';
import { ErrorIcon, ExternalLinkIcon } from './icons';
import type { IntentTrackingProps } from './types';

export function ErrorView({ state, onReset }: IntentTrackingProps) {
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
