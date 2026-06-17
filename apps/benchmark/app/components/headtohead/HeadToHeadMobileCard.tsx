import { Skeleton } from '../Skeleton';
import { formatFeePercent, formatFillCount, formatFillSeconds, formatSuccessRate } from '../leaderboard/formatters';
import { NoFeedChip } from '../mobile/NoFeedChip';
import { ProviderChip } from '../mobile/ProviderChip';
import { StatCell } from '../mobile/StatCell';
import { BestAtBadgeChip } from './BestAtBadgeChip';
import type { BestAtBadge } from '~/lib/headToHeadBadges';
import type { ProviderMetrics } from '~/lib/types/historyMetrics';
import { cn } from '~/lib/cn';
import { PROVIDERS } from '~/lib/providers';

interface HeadToHeadMobileCardProps {
  metrics: ProviderMetrics;
  badges: readonly BestAtBadge[];
  isLoading?: boolean;
}

// Mobile head-to-head card: provider header with BEST AT badges on the right,
// then a FILLS / SUCCESS / P50 / FEE stat strip. A no-feed provider (Bungee) is
// dimmed and shows a NO FEED chip. While a refetch is in flight the stat values
// turn into skeletons, mirroring the desktop row.
export function HeadToHeadMobileCard({ metrics, badges, isLoading = false }: HeadToHeadMobileCardProps) {
  const provider = PROVIDERS[metrics.providerId];
  const isPlaceholder = !provider.hasGlobalFeed;
  const skeletonize = isLoading && !isPlaceholder;

  return (
    <article
      className={cn(
        'flex flex-col gap-3 border-b border-border-subtle p-4 last:border-b-0',
        isPlaceholder && 'opacity-55',
      )}
    >
      <div className='flex items-center justify-between gap-3'>
        <ProviderChip provider={provider} />
        {isPlaceholder ? (
          <NoFeedChip />
        ) : badges.length > 0 ? (
          <div className='flex flex-wrap items-center justify-end gap-1.5'>
            {badges.map((badge) => (
              <BestAtBadgeChip key={badge} label={badge} />
            ))}
          </div>
        ) : null}
      </div>
      <div className='flex items-start justify-between gap-2'>
        <Stat label='FILLS' value={formatFillCount(metrics.fillCount)} skeletonize={skeletonize} />
        <Stat label='SUCCESS' value={formatSuccessRate(metrics.successRate)} skeletonize={skeletonize} />
        <Stat label='P50' value={formatFillSeconds(metrics.p50FillSeconds)} skeletonize={skeletonize} />
        <Stat label='FEE' value={formatFeePercent(metrics.feePercent)} skeletonize={skeletonize} align='end' />
      </div>
    </article>
  );
}

function Stat({
  label,
  value,
  skeletonize,
  align = 'start',
}: {
  label: string;
  value: string;
  skeletonize: boolean;
  align?: 'start' | 'end';
}) {
  if (skeletonize) {
    return (
      <div className={cn('flex flex-col gap-[3px]', align === 'end' && 'items-end')}>
        <span className='font-mono text-[9px] uppercase leading-none tracking-[0.04em] text-text-muted'>{label}</span>
        <Skeleton className='h-[13px] w-10' />
      </div>
    );
  }
  return <StatCell label={label} value={value} align={align} />;
}
