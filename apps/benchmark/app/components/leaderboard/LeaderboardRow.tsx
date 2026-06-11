import { METRICS_ROW_CLASS } from '../metricsTable';
import { LEADERBOARD_COLUMNS } from './constants';
import type { ProviderMetrics } from '~/lib/types/historyMetrics';
import { cn } from '~/lib/cn';
import { PROVIDERS } from '~/lib/providers';

interface LeaderboardRowProps {
  metrics: ProviderMetrics;
  rank: number;
  isWinner: boolean;
}

export function LeaderboardRow({ metrics, rank, isWinner }: LeaderboardRowProps) {
  const provider = PROVIDERS[metrics.providerId];
  const isPlaceholder = !provider.hasGlobalFeed;
  const ctx = { rank, isWinner, isPlaceholder, provider };

  return (
    <tr className={cn(METRICS_ROW_CLASS, isWinner && 'bg-accent-soft', isPlaceholder && 'opacity-55')}>
      {LEADERBOARD_COLUMNS.map((column) => (
        <td key={column.key} className={column.tdClass}>
          {column.render(metrics, ctx)}
        </td>
      ))}
    </tr>
  );
}
