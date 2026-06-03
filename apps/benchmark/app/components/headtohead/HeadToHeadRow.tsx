import { METRICS_ROW_CLASS } from '../metricsTable';
import { HEAD_TO_HEAD_COLUMNS } from './constants';
import type { BestAtBadge } from '~/lib/headToHeadBadges';
import type { ProviderMetrics } from '~/lib/types/historyMetrics';
import { cn } from '~/lib/cn';
import { PROVIDERS } from '~/lib/providers';

interface HeadToHeadRowProps {
  metrics: ProviderMetrics;
  badges: readonly BestAtBadge[];
}

export function HeadToHeadRow({ metrics, badges }: HeadToHeadRowProps) {
  const provider = PROVIDERS[metrics.providerId];
  const isPlaceholder = !provider.hasGlobalFeed;
  const ctx = { provider, isPlaceholder, badges };

  return (
    <tr className={cn(METRICS_ROW_CLASS, isPlaceholder && 'opacity-55')}>
      {HEAD_TO_HEAD_COLUMNS.map((column) => (
        <td key={column.key} className={column.tdClass}>
          {column.render(metrics, ctx)}
        </td>
      ))}
    </tr>
  );
}
