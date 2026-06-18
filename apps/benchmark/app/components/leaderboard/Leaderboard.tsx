import { BenchmarkTable } from '../BenchmarkTable';
import { LeaderboardMobileCard } from './LeaderboardMobileCard';
import { LeaderboardRow } from './LeaderboardRow';
import { LEADERBOARD_COLUMNS } from './constants';
import type { ProviderMetrics } from '~/lib/types/historyMetrics';
import { sortLeaderboardBySuccess } from '~/lib/historyAggregation';

interface LeaderboardProps {
  metrics: readonly ProviderMetrics[];
}

export function Leaderboard({ metrics }: LeaderboardProps) {
  const sorted = sortLeaderboardBySuccess(metrics);
  // Only crown a winner when the top row actually has a success rate. Without
  // this guard, a leaderboard where every provider returned null (all-pending
  // or all-failed window) would highlight a row that did not win anything.
  const top = sorted[0];
  const winnerId = top?.successRate !== null && top?.successRate !== undefined ? top.providerId : null;

  return (
    <div
      className='overflow-hidden border border-border bg-surface-elevated'
      role='region'
      aria-label='provider leaderboard'
    >
      <div className='hidden md:block'>
        <BenchmarkTable
          columns={LEADERBOARD_COLUMNS}
          rows={sorted}
          getRowKey={(row) => row.providerId}
          renderRow={(row, index) => (
            <LeaderboardRow metrics={row} rank={index + 1} isWinner={row.providerId === winnerId} />
          )}
        />
      </div>
      <div className='md:hidden'>
        {sorted.map((row, index) => (
          <LeaderboardMobileCard
            key={row.providerId}
            metrics={row}
            rank={index + 1}
            isWinner={row.providerId === winnerId}
          />
        ))}
      </div>
    </div>
  );
}
