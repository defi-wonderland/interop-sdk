import { useChainConfig } from '../../hooks/useNetworkConfig';
import { STEP } from '../../types/execution';
import { formatMessageWithDate } from '../../utils/formatting';
import { CloseIcon, ExternalLinkIcon } from '../icons';
import type { ErrorViewProps } from './types';

function getErrorTitle(step: typeof STEP.TIMEOUT | typeof STEP.ERROR): string {
  return step === STEP.TIMEOUT ? 'Tracking Timeout' : 'Order Error';
}

function getMessage(state: ErrorViewProps['state']): string {
  if (state.step === STEP.TIMEOUT) {
    return state.timeout.message;
  }
  return state.message;
}

function getTimeoutNotice(state: ErrorViewProps['state'], chainName: string | undefined): string | null {
  if (state.step !== STEP.TIMEOUT) return null;
  const lastStatus = state.update?.status;
  const chain = chainName ?? 'the origin chain';

  // If the order was already settled/executed, it likely completed - just tracking lost it
  if (lastStatus === 'settled' || lastStatus === 'executed' || lastStatus === 'settling') {
    return 'The order may have completed after tracking stopped. Check the origin transaction for details.';
  }

  // If still pending/created, it probably expired unfilled
  return `If the order expired unfilled, your tokens will be refunded automatically to your wallet on ${chain}. This usually takes 1-3 hours.`;
}

export function ErrorView({ state, onReset }: ErrorViewProps) {
  const chainConfig = useChainConfig();
  const originChainId = 'originChainId' in state ? state.originChainId : undefined;
  const originChain = chainConfig.getChain(originChainId);
  const originTxUrl = chainConfig.getExplorerTxUrl(originChainId, state.txHash);
  const isTimeout = state.step === STEP.TIMEOUT;
  const timeoutNotice = getTimeoutNotice(state, originChain?.name);
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
          <h3 className={`text-lg font-semibold ${textColor}`}>{getErrorTitle(state.step)}</h3>
          <p className='text-sm text-text-secondary'>{formatMessageWithDate(getMessage(state))}</p>
        </div>
      </div>

      {/* Context notice for timeouts */}
      {timeoutNotice && (
        <div className='p-3 rounded-lg bg-warning/10 border border-warning/20 mb-4'>
          <p className='text-sm text-warning'>{timeoutNotice}</p>
        </div>
      )}

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
          Reset and Try Again
        </button>
      )}
    </div>
  );
}
