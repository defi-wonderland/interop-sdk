import { Icon } from '../Icon';
import { formatAvgFee, formatFillCount, formatFillSeconds, formatSuccessRate } from './formatters';
import type { ProviderMetrics } from '~/lib/types/historyMetrics';
import { cn } from '~/lib/cn';
import { PROVIDERS, type ProviderMeta } from '~/lib/providers';

interface LeaderboardRowProps {
  metrics: ProviderMetrics;
  rank: number;
  isWinner: boolean;
}

export function LeaderboardRow({ metrics, rank, isWinner }: LeaderboardRowProps) {
  const provider = PROVIDERS[metrics.providerId];
  const isPlaceholder = !provider.hasGlobalFeed;

  return (
    <tr
      className={cn(
        'border-b border-border-subtle align-middle last:border-b-0',
        isWinner && 'bg-accent-soft',
        isPlaceholder && 'opacity-55',
      )}
    >
      <td className='px-3 py-4 md:px-4 md:py-5'>
        <RankCell rank={rank} isWinner={isWinner} isPlaceholder={isPlaceholder} provider={provider} />
      </td>
      <td className='px-3 py-4 md:px-4 md:py-5'>
        <ProviderCell provider={provider} />
      </td>
      <td className='hidden px-4 py-5 text-right font-mono text-mark text-text-primary tabular-nums md:table-cell'>
        {formatFillCount(metrics.fillCount)}
      </td>
      <td className='px-3 py-4 text-right font-mono text-mark font-medium text-text-primary tabular-nums md:px-4 md:py-5'>
        {formatSuccessRate(metrics.successRate)}
      </td>
      <td className='hidden px-4 py-5 text-right font-mono text-mark text-text-primary tabular-nums md:table-cell'>
        {formatFillSeconds(metrics.p50FillSeconds)}
      </td>
      <td className='hidden px-4 py-5 text-right font-mono text-mark text-text-secondary tabular-nums md:table-cell'>
        {formatFillSeconds(metrics.p99FillSeconds)}
      </td>
      <td className='px-3 py-4 text-right font-mono text-mark text-text-primary tabular-nums md:px-4 md:py-5'>
        {formatAvgFee(metrics.avgFeeUsd)}
      </td>
    </tr>
  );
}

function RankCell({
  rank,
  isWinner,
  isPlaceholder,
  provider,
}: {
  rank: number;
  isWinner: boolean;
  isPlaceholder: boolean;
  provider: ProviderMeta;
}) {
  if (isPlaceholder) {
    return <span className='font-mono text-mark text-text-muted'>—</span>;
  }
  return (
    <div className='flex items-center gap-1.5 font-mono text-mark tabular-nums'>
      {isWinner ? (
        <span className={cn('inline-block size-1.5 rounded-full', provider.colorClass)} aria-hidden='true' />
      ) : null}
      <span className={cn(isWinner ? 'font-medium text-accent' : 'text-text-secondary')}>{rank}</span>
    </div>
  );
}

function ProviderCell({ provider }: { provider: ProviderMeta }) {
  return (
    <div className='flex items-center gap-2.5 md:gap-3'>
      <Icon src={provider.iconUrl} alt='' size='md' />
      <div className='flex flex-col gap-0.5'>
        <span className='font-sans text-mark font-medium tracking-[-0.0125em] text-text-primary md:text-base'>
          {provider.displayName}
        </span>
        {provider.noFeedReason ? (
          <span className='font-mono text-caption uppercase tracking-[0.06em] text-text-muted'>
            {provider.noFeedReason}
          </span>
        ) : null}
      </div>
    </div>
  );
}
