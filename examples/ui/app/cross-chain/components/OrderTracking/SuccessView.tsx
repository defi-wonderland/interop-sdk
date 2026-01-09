import { getChainConfig, getExplorerTxUrl } from '../../constants/chains';
import { CheckIcon, ExternalLinkIcon } from '../icons';
import type { OrderTrackingProps } from './types';

export function SuccessView({ state, onReset }: OrderTrackingProps) {
  const originChain = getChainConfig(state.originChainId);
  const destinationChain = getChainConfig(state.destinationChainId);
  const originTxUrl = getExplorerTxUrl(state.originChainId, state.txHash);
  const fillTxUrl = getExplorerTxUrl(state.destinationChainId, state.fillTxHash);

  return (
    <div className='p-4 sm:p-6 rounded-xl border border-accent/30 bg-accent/5'>
      {/* Success header */}
      <div className='flex items-start gap-3 mb-4'>
        <div className='w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-accent flex items-center justify-center shrink-0'>
          <CheckIcon className='w-5 h-5 sm:w-6 sm:h-6 text-white' />
        </div>
        <div className='min-w-0'>
          <h3 className='text-base sm:text-lg font-semibold text-accent'>Order Filled Successfully!</h3>
          <p className='text-xs sm:text-sm text-text-secondary break-words'>{state.message}</p>
        </div>
      </div>

      {/* Transaction links */}
      <div className='space-y-2 mb-4'>
        {state.txHash && originTxUrl && (
          <a
            href={originTxUrl}
            target='_blank'
            rel='noopener noreferrer'
            className='block p-3 rounded-lg bg-surface border border-border hover:border-accent/50 transition-colors group'
          >
            <div className='flex items-center justify-between mb-1'>
              <div className='flex items-center gap-2'>
                <div className='w-2 h-2 rounded-full bg-accent/60' />
                <span className='text-sm font-medium text-text-primary'>Origin</span>
              </div>
              <span className='text-xs text-text-tertiary'>{originChain?.name ?? 'Unknown'}</span>
            </div>
            <div className='flex items-center justify-between text-text-tertiary group-hover:text-accent'>
              <span className='text-sm font-mono'>
                {state.txHash.slice(0, 10)}...{state.txHash.slice(-8)}
              </span>
              <ExternalLinkIcon />
            </div>
          </a>
        )}
        {state.fillTxHash && fillTxUrl && (
          <a
            href={fillTxUrl}
            target='_blank'
            rel='noopener noreferrer'
            className='block p-3 rounded-lg bg-surface border border-border hover:border-accent/50 transition-colors group'
          >
            <div className='flex items-center justify-between mb-1'>
              <div className='flex items-center gap-2'>
                <div className='w-2 h-2 rounded-full bg-accent' />
                <span className='text-sm font-medium text-text-primary'>Fill</span>
              </div>
              <span className='text-xs text-text-tertiary'>{destinationChain?.name ?? 'Unknown'}</span>
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
          View raw order data
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
          Start New Order
        </button>
      )}
    </div>
  );
}
