import { NoFeedChip } from '../mobile/NoFeedChip';
import { ProviderChip } from '../mobile/ProviderChip';
import { StatCell } from '../mobile/StatCell';
import {
  formatFeePercent,
  formatFillCount,
  formatFillSeconds,
  formatSampleWindow,
  formatSize,
  formatSuccessRate,
} from './formatters';
import type { ProviderMetrics } from '~/lib/types/historyMetrics';
import { cn } from '~/lib/cn';
import { PROVIDERS } from '~/lib/providers';

interface LeaderboardMobileCardProps {
  metrics: ProviderMetrics;
  rank: number;
  isWinner: boolean;
}

// Mobile leaderboard card: provider header with rank on the right, a sample-size
// subline, then a stat strip. A no-feed provider (Bungee) is dimmed and swaps
// the rank for a NO FEED chip with em-dash stats.
export function LeaderboardMobileCard({ metrics, rank, isWinner }: LeaderboardMobileCardProps) {
  const provider = PROVIDERS[metrics.providerId];
  const isPlaceholder = !provider.hasGlobalFeed;
  const sublabel = buildSublabel(isPlaceholder, metrics);

  return (
    <article
      className={cn(
        'flex flex-col gap-3 border-b border-border-subtle p-4 last:border-b-0',
        isWinner && 'bg-accent-soft',
        isPlaceholder && 'opacity-55',
      )}
    >
      <div className='flex items-center justify-between gap-3'>
        <ProviderChip provider={provider} />
        {isPlaceholder ? (
          <NoFeedChip />
        ) : (
          <div className='flex items-center gap-1.5 font-mono text-[11px] tabular-nums'>
            {isWinner ? (
              <span className={cn('inline-block size-[5px] rounded-full', provider.colorClass)} aria-hidden='true' />
            ) : null}
            <span className={cn('font-medium', isWinner ? 'text-accent' : 'text-text-secondary')}>#{rank}</span>
          </div>
        )}
      </div>
      {sublabel ? <span className='font-mono text-[10px] tracking-[0.02em] text-text-muted'>{sublabel}</span> : null}
      <div className='flex items-start justify-between gap-2'>
        <StatCell label='SUCCESS' value={formatSuccessRate(metrics.successRate)} />
        <StatCell
          label='P50'
          value={formatFillSeconds(metrics.p50FillSeconds)}
          tooltip='Median fill time. Half of fills finish faster than this, half slower.'
        />
        <StatCell
          label='P99'
          value={formatFillSeconds(metrics.p99FillSeconds)}
          tooltip='Worst-case fill time. Only 1 in 100 fills is slower than this.'
        />
        <StatCell
          label='SIZE'
          value={formatSize(metrics.medianSizeUsd)}
          tooltip='Median intent size in USD: the typical amount moved per fill.'
        />
        <StatCell
          label='FEE'
          value={formatFeePercent(metrics.feePercent)}
          align='end'
          tooltip='Typical fee as a % of the amount moved.'
        />
      </div>
    </article>
  );
}

function buildSublabel(isPlaceholder: boolean, metrics: ProviderMetrics): string | null {
  // No public feed (Bungee): say why, not a fill count.
  if (isPlaceholder) return PROVIDERS[metrics.providerId].noFeedReason?.toLowerCase() ?? 'no global feed';
  // Has a feed but returned nothing usable (failed or empty window): no sublabel.
  if (metrics.fillCount === null) return null;
  const fills = `${formatFillCount(metrics.fillCount)} fills`;
  // A single-fill sample has no span to show.
  if (metrics.sampleWindowSeconds === null) return fills;
  return `${fills} · ${formatSampleWindow(metrics.sampleWindowSeconds)}`;
}
