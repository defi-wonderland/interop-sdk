import { ProviderCell } from '../leaderboard/ProviderCell';
import { formatFeePercent, formatFillCount, formatFillSeconds, formatSuccessRate } from '../leaderboard/formatters';
import { METRICS_CELL_NUM, METRICS_CELL_NUM_HIDDEN, METRICS_CELL_STACK, type MetricsColumn } from '../metricsTable';
import type { BestAtBadge } from '~/lib/headToHeadBadges';
import type { ProviderMeta } from '~/lib/providers';
import { cn } from '~/lib/cn';

export interface HeadToHeadRowContext {
  provider: ProviderMeta;
  isPlaceholder: boolean;
  badges: readonly BestAtBadge[];
}

export type HeadToHeadColumn = MetricsColumn<HeadToHeadRowContext>;

export const HEAD_TO_HEAD_COLUMNS: readonly HeadToHeadColumn[] = [
  {
    key: 'provider',
    label: 'PROVIDER',
    tdClass: METRICS_CELL_STACK,
    render: (_metrics, ctx) => <ProviderCell provider={ctx.provider} />,
  },
  {
    key: 'fills',
    label: 'FILLS',
    className: 'hidden text-right md:table-cell md:w-28',
    tdClass: `${METRICS_CELL_NUM_HIDDEN} text-text-primary`,
    render: (metrics) => formatFillCount(metrics.fillCount),
  },
  {
    key: 'success',
    label: 'SUCCESS',
    className: 'text-right md:w-28',
    tdClass: `${METRICS_CELL_NUM} font-medium text-text-primary`,
    render: (metrics) => formatSuccessRate(metrics.successRate),
  },
  {
    key: 'p50',
    label: 'P50 FILL',
    className: 'hidden text-right md:table-cell md:w-28',
    tdClass: `${METRICS_CELL_NUM_HIDDEN} text-text-primary`,
    tooltip: 'Median fill time. Half of fills finish faster than this, half slower.',
    render: (metrics) => formatFillSeconds(metrics.p50FillSeconds),
  },
  {
    key: 'fee',
    label: 'FEE %',
    className: 'text-right md:w-24',
    tdClass: `${METRICS_CELL_NUM} text-text-primary`,
    tooltip: 'Typical fee as a % of the amount moved.',
    render: (metrics) => formatFeePercent(metrics.feePercent),
  },
  {
    key: 'bestAt',
    label: 'BEST AT',
    className: 'text-right md:w-48',
    tdClass: `${METRICS_CELL_STACK} text-right`,
    render: (_metrics, ctx) => <BestAtCell badges={ctx.badges} />,
  },
];

function BestAtCell({ badges }: { badges: readonly BestAtBadge[] }) {
  if (badges.length === 0) {
    return <span className='font-mono text-mark text-text-muted'>—</span>;
  }
  return (
    <div className='flex flex-wrap items-center justify-end gap-1.5'>
      {badges.map((badge) => (
        <BestAtBadgeChip key={badge} label={badge} />
      ))}
    </div>
  );
}

function BestAtBadgeChip({ label }: { label: BestAtBadge }) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap bg-accent px-2 py-[3px]',
        'font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-on-accent',
      )}
    >
      {label}
    </span>
  );
}
