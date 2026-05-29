import { BenchmarkTable } from '../BenchmarkTable';
import { LeaderboardRow } from './LeaderboardRow';
import { LEADERBOARD_COLUMNS } from './constants';
import type { ProviderMetrics } from '~/lib/types/historyMetrics';
import { sortLeaderboardBySuccess } from '~/lib/historyAggregation';

interface LeaderboardProps {
  metrics: readonly ProviderMetrics[];
}

export function Leaderboard({ metrics }: LeaderboardProps) {
  const sorted = sortLeaderboardBySuccess(metrics);
  const winnerId = sorted[0]?.providerId;

  return (
    <div
      className='overflow-hidden border border-border bg-surface-elevated'
      role='region'
      aria-label='provider leaderboard'
    >
      <BenchmarkTable
        columns={LEADERBOARD_COLUMNS}
        rows={sorted}
        getRowKey={(row) => row.providerId}
        renderRow={(row, index) => (
          <LeaderboardRow metrics={row} rank={index + 1} isWinner={row.providerId === winnerId} />
        )}
      />
    </div>
  );
}
