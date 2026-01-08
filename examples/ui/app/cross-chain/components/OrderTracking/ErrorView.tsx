import { getChainConfig, getExplorerTxUrl } from '../../constants/chains';
import { EXECUTION_STATUS } from '../../types/execution';
import { CloseIcon, ExternalLinkIcon } from '../icons';
import type { OrderTrackingProps } from './types';

function getErrorTitle(status: string): string {
  switch (status) {
    case EXECUTION_STATUS.EXPIRED:
      return 'Order Expired';
    case EXECUTION_STATUS.FAILED:
      return 'Order Failed';
    default:
      return 'Order Error';
  }
}

export function ErrorView({ state, onReset }: OrderTrackingProps) {
  const originChain = getChainConfig(state.originChainId);
  const originTxUrl = getExplorerTxUrl(state.originChainId, state.txHash);

  return (
    <div className='p-6 rounded-xl border border-error/30 bg-error/5'>
      {/* Error header */}
      <div className='flex items-center gap-3 mb-4'>
        <div className='w-12 h-12 rounded-full bg-error flex items-center justify-center text-white'>
          <CloseIcon className='w-6 h-6' />
        </div>
        <div>
          <h3 className='text-lg font-semibold text-error'>{getErrorTitle(state.status)}</h3>
          <p className='text-sm text-text-secondary'>{state.message}</p>
        </div>
      </div>

      {/* Transaction link if available */}
      {state.txHash && originTxUrl && (
        <a
          href={originTxUrl}
          target='_blank'
          rel='noopener noreferrer'
          className='flex items-center justify-between p-3 rounded-lg bg-error/10 border border-error/30 hover:border-error/50 transition-colors group mb-4'
        >
          <div className='flex items-center gap-2'>
            <div className='w-2 h-2 rounded-full bg-error' />
            <span className='text-sm text-error/80'>Origin Transaction ({originChain?.name ?? 'Unknown'})</span>
          </div>
          <div className='flex items-center gap-2 text-error/70 group-hover:text-error'>
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
          className='w-full py-3 px-4 text-sm font-medium rounded-lg border border-error/50 hover:bg-error/10 text-error transition-colors'
        >
          Try Again
        </button>
      )}
    </div>
  );
}
