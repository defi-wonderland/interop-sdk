import { BenchmarkTable } from '../BenchmarkTable';
import { HeadToHeadRow } from './HeadToHeadRow';
import { HEAD_TO_HEAD_COLUMNS } from './constants';
import type { ProviderMetrics } from '~/lib/types/historyMetrics';
import { computeBestAtBadges } from '~/lib/headToHeadBadges';

interface HeadToHeadProps {
  metrics: readonly ProviderMetrics[];
}

export function HeadToHead({ metrics }: HeadToHeadProps) {
  const badges = computeBestAtBadges(metrics);

  return (
    <div
      className='overflow-hidden border border-border bg-surface-elevated'
      role='region'
      aria-label='head-to-head comparison'
    >
      <BenchmarkTable
        columns={HEAD_TO_HEAD_COLUMNS}
        rows={metrics}
        getRowKey={(row) => row.providerId}
        renderRow={(row) => <HeadToHeadRow metrics={row} badges={badges.get(row.providerId) ?? []} />}
      />
    </div>
  );
}
