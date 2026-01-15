import { getChainConfig, getExplorerTxUrl } from '../../constants/chains';
import { EXECUTION_STATUS } from '../../types/execution';
import { formatMessageWithDate } from '../../utils/formatting';
import { CloseIcon, ExternalLinkIcon } from '../icons';
import type { OrderTrackingProps } from './types';

function getErrorTitle(status: string): string {
  switch (status) {
    case EXECUTION_STATUS.EXPIRED:
      return 'Order Expired';
    case EXECUTION_STATUS.FAILED:
      return 'Order Failed';
    case EXECUTION_STATUS.TIMEOUT:
      return 'Tracking Timeout';
    default:
      return 'Order Error';
  }
}

export function ErrorView({ state, onReset }: OrderTrackingProps) {
  const originChain = getChainConfig(state.originChainId);
  const originTxUrl = getExplorerTxUrl(state.originChainId, state.txHash);
  const isTimeout = state.status === EXECUTION_STATUS.TIMEOUT;
  const borderColor = isTimeout ? 'border-warning/30' : 'border-error/30';
  const bgColor = isTimeout ? 'bg-warning/5' : 'bg-error/5';
  const iconBg = isTimeout ? 'bg-warning' : 'bg-error';
  const textColor = isTimeout ? 'text-warning' : 'text-error';
  const linkBg = isTimeout
    ? 'bg-warning/10 border-warning/30 hover:border-warning/50'
    : 'bg-error/10 border-error/30 hover:border-error/50';
  const linkText = isTimeout ? 'text-warning/80' : 'text-error/80';
  const linkHoverText = isTimeout ? 'text-warning/70 group-hover:text-warning' : 'text-error/70 group-hover:text-error';
  const buttonBorder = isTimeout ? 'border-warning/50 hover:bg-warning/10' : 'border-error/50 hover:bg-error/10';

  return (
    <div className={`p-6 rounded-xl border ${borderColor} ${bgColor}`}>
      {/* Error/Warning header */}
      <div className='flex items-center gap-3 mb-4'>
        <div className={`w-12 h-12 rounded-full ${iconBg} flex items-center justify-center text-white shrink-0`}>
          <CloseIcon className='w-6 h-6' />
        </div>
        <div>
          <h3 className={`text-lg font-semibold ${textColor}`}>{getErrorTitle(state.status)}</h3>
          <p className='text-sm text-text-secondary'>{formatMessageWithDate(state.message)}</p>
        </div>
      </div>

      {/* Transaction link if available */}
      {state.txHash && originTxUrl && (
        <a
          href={originTxUrl}
          target='_blank'
          rel='noopener noreferrer'
          className={`flex items-center justify-between p-3 rounded-lg ${linkBg} transition-colors group mb-4`}
        >
          <div className='flex items-center gap-2'>
            <div className={`w-2 h-2 rounded-full ${iconBg}`} />
            <span className={`text-sm ${linkText}`}>Origin Transaction ({originChain?.name ?? 'Unknown'})</span>
          </div>
          <div className={`flex items-center gap-2 ${linkHoverText}`}>
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
          className={`w-full py-3 px-4 text-sm font-medium rounded-lg border ${buttonBorder} ${textColor} transition-colors`}
        >
          {isTimeout ? 'Check Status' : 'Try Again'}
        </button>
      )}
    </div>
  );
}
