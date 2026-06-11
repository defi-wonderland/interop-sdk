import { METRICS_CELL_NUM, METRICS_CELL_NUM_HIDDEN, METRICS_CELL_STACK, type MetricsColumn } from '../metricsTable';
import { LeaderboardProviderCell } from './LeaderboardProviderCell';
import { formatAvgFee, formatFillSeconds, formatSuccessRate } from './formatters';
import type { ProviderMeta } from '~/lib/providers';
import { cn } from '~/lib/cn';

export interface LeaderboardRowContext {
  rank: number;
  isWinner: boolean;
  isPlaceholder: boolean;
  provider: ProviderMeta;
}

export type LeaderboardColumn = MetricsColumn<LeaderboardRowContext>;

export const LEADERBOARD_COLUMNS: readonly LeaderboardColumn[] = [
  {
    key: 'rank',
    label: 'RANK',
    className: 'w-10 md:w-12',
    tdClass: METRICS_CELL_STACK,
    render: (_metrics, ctx) => <RankCell {...ctx} />,
  },
  {
    key: 'provider',
    label: 'PROVIDER',
    tdClass: METRICS_CELL_STACK,
    render: (metrics, ctx) => (
      <LeaderboardProviderCell
        provider={ctx.provider}
        fillCount={metrics.fillCount}
        windowSeconds={metrics.sampleWindowSeconds}
      />
    ),
  },
  {
    key: 'success',
    label: 'SUCCESS',
    className: 'text-right md:w-32',
    tdClass: `${METRICS_CELL_NUM} font-medium text-text-primary`,
    render: (metrics) => formatSuccessRate(metrics.successRate),
  },
  {
    key: 'p50',
    label: 'P50 FILL',
    className: 'hidden text-right md:table-cell md:w-32',
    tdClass: `${METRICS_CELL_NUM_HIDDEN} text-text-primary`,
    tooltip: 'Median fill time. Half of fills finish faster than this, half slower.',
    render: (metrics) => formatFillSeconds(metrics.p50FillSeconds),
  },
  {
    key: 'p99',
    label: 'P99 FILL',
    className: 'hidden text-right md:table-cell md:w-32',
    tdClass: `${METRICS_CELL_NUM_HIDDEN} text-text-secondary`,
    tooltip: 'Worst-case fill time. Only 1 in 100 fills is slower than this.',
    render: (metrics) => formatFillSeconds(metrics.p99FillSeconds),
  },
  {
    key: 'fee',
    label: 'AVG FEE',
    className: 'text-right md:w-28',
    tdClass: `${METRICS_CELL_NUM} text-text-primary`,
    render: (metrics) => formatAvgFee(metrics.avgFeeUsd),
  },
];

function RankCell({ rank, isWinner, isPlaceholder, provider }: LeaderboardRowContext) {
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
