import { BenchmarkTable } from '../BenchmarkTable';
import { HeadToHeadMobileCard } from './HeadToHeadMobileCard';
import { HeadToHeadRow } from './HeadToHeadRow';
import { HEAD_TO_HEAD_COLUMNS } from './constants';
import type { ProviderMetrics } from '~/lib/types/historyMetrics';
import { computeBestAtBadges } from '~/lib/headToHeadBadges';

interface HeadToHeadProps {
  metrics: readonly ProviderMetrics[];
  isLoading?: boolean;
}

export function HeadToHead({ metrics, isLoading = false }: HeadToHeadProps) {
  const badges = computeBestAtBadges(metrics);

  return (
    <div
      className='overflow-hidden border border-border bg-surface-elevated'
      role='region'
      aria-label='head-to-head comparison'
      aria-busy={isLoading}
    >
      <div className='hidden md:block'>
        <BenchmarkTable
          columns={HEAD_TO_HEAD_COLUMNS}
          rows={metrics}
          getRowKey={(row) => row.providerId}
          renderRow={(row) => (
            <HeadToHeadRow metrics={row} badges={badges.get(row.providerId) ?? []} isLoading={isLoading} />
          )}
        />
      </div>
      <div className='md:hidden'>
        {metrics.map((row) => (
          <HeadToHeadMobileCard
            key={row.providerId}
            metrics={row}
            badges={badges.get(row.providerId) ?? []}
            isLoading={isLoading}
          />
        ))}
      </div>
    </div>
  );
}
