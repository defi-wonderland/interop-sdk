import type { ReactNode } from 'react';
import { Icon } from '../Icon';
import { formatAvgFee, formatFillCount, formatFillSeconds, formatSuccessRate } from './formatters';
import type { BenchmarkColumn } from '../BenchmarkTable';
import type { ProviderMeta } from '~/lib/providers';
import type { ProviderMetrics } from '~/lib/types/historyMetrics';
import { cn } from '~/lib/cn';

export interface LeaderboardRowContext {
  rank: number;
  isWinner: boolean;
  isPlaceholder: boolean;
  provider: ProviderMeta;
}

export interface LeaderboardColumn extends BenchmarkColumn {
  tdClass: string;
  render: (metrics: ProviderMetrics, ctx: LeaderboardRowContext) => ReactNode;
}

const STACK_CELL = 'px-3 py-4 md:px-4 md:py-5';
const NUM_CELL = `${STACK_CELL} text-right font-mono text-mark tabular-nums`;
const NUM_CELL_HIDDEN = `hidden ${NUM_CELL} md:table-cell`;

export const LEADERBOARD_COLUMNS: readonly LeaderboardColumn[] = [
  {
    key: 'rank',
    label: '#',
    className: 'w-10 md:w-12',
    tdClass: STACK_CELL,
    render: (_metrics, ctx) => <RankCell {...ctx} />,
  },
  {
    key: 'provider',
    label: 'PROVIDER',
    tdClass: STACK_CELL,
    render: (_metrics, ctx) => <ProviderCell provider={ctx.provider} />,
  },
  {
    key: 'fills',
    label: 'FILLS 24H',
    className: 'hidden text-right md:table-cell md:w-32',
    tdClass: `${NUM_CELL_HIDDEN} text-text-primary`,
    render: (metrics) => formatFillCount(metrics.fillCount),
  },
  {
    key: 'success',
    label: 'SUCCESS',
    className: 'text-right md:w-32',
    tdClass: `${NUM_CELL} font-medium text-text-primary`,
    render: (metrics) => formatSuccessRate(metrics.successRate),
  },
  {
    key: 'p50',
    label: 'P50 FILL',
    className: 'hidden text-right md:table-cell md:w-32',
    tdClass: `${NUM_CELL_HIDDEN} text-text-primary`,
    render: (metrics) => formatFillSeconds(metrics.p50FillSeconds),
  },
  {
    key: 'p99',
    label: 'P99 FILL',
    className: 'hidden text-right md:table-cell md:w-32',
    tdClass: `${NUM_CELL_HIDDEN} text-text-secondary`,
    render: (metrics) => formatFillSeconds(metrics.p99FillSeconds),
  },
  {
    key: 'fee',
    label: 'AVG FEE',
    className: 'text-right md:w-28',
    tdClass: `${NUM_CELL} text-text-primary`,
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

function ProviderCell({ provider }: { provider: ProviderMeta }) {
  return (
    <div className='flex items-center gap-2.5 md:gap-3'>
      <Icon src={provider.iconUrl} alt='' size='md' />
      <span className='font-sans text-mark font-medium tracking-[-0.0125em] text-text-primary md:text-base'>
        {provider.displayName}
      </span>
      {provider.noFeedReason ? (
        <span className='hidden whitespace-nowrap font-mono text-caption uppercase tracking-[0.06em] text-text-muted md:inline'>
          {provider.noFeedReason}
        </span>
      ) : null}
    </div>
  );
}
