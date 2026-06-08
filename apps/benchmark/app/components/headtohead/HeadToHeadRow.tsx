import { Skeleton } from '../Skeleton';
import { METRICS_ROW_CLASS } from '../metricsTable';
import { HEAD_TO_HEAD_COLUMNS } from './constants';
import type { BestAtBadge } from '~/lib/headToHeadBadges';
import type { ProviderMetrics } from '~/lib/types/historyMetrics';
import { cn } from '~/lib/cn';
import { PROVIDERS } from '~/lib/providers';

interface HeadToHeadRowProps {
  metrics: ProviderMetrics;
  badges: readonly BestAtBadge[];
  isLoading?: boolean;
}

export function HeadToHeadRow({ metrics, badges, isLoading = false }: HeadToHeadRowProps) {
  const provider = PROVIDERS[metrics.providerId];
  const isPlaceholder = !provider.hasGlobalFeed;
  const ctx = { provider, isPlaceholder, badges };
  // The provider cell stays put; only its metrics turn into skeletons while a
  // refetch is in flight. Bungee has no feed, so its placeholder row keeps its
  // em-dashes rather than implying data is on the way.
  const skeletonize = isLoading && !isPlaceholder;

  return (
    <tr className={cn(METRICS_ROW_CLASS, isPlaceholder && 'opacity-55')}>
      {HEAD_TO_HEAD_COLUMNS.map((column) => (
        <td key={column.key} className={column.tdClass}>
          {skeletonize && column.key !== 'provider' ? (
            <span className='flex justify-end'>
              <Skeleton />
            </span>
          ) : (
            column.render(metrics, ctx)
          )}
        </td>
      ))}
    </tr>
  );
}
