import { withTimeout } from '../helpers';
import { aggregateProviderSamples } from '../historyAggregation';
import { ProviderId } from '../providers';
import { acrossHistoryService, lifiIntentsHistoryService, relayHistoryService } from '.';
import type { HistoryService } from '../interfaces/historyService.interface';
import type { HistoryQuery, ProviderMetrics } from '../types/historyMetrics';

// Per-provider deadline so one hung upstream cannot block the rest. The page
// keeps a slightly larger overall timeout as the outer guardrail.
const PROVIDER_TIMEOUT_MS = 10_000;

function nullMetricsFor(providerId: ProviderId): ProviderMetrics {
  // Always return a fresh object so downstream mutation (e.g. sort, splice)
  // cannot leak between calls.
  return {
    providerId,
    fillCount: null,
    successRate: null,
    p50FillSeconds: null,
    p99FillSeconds: null,
    avgFeeUsd: null,
    volumeUsd: null,
  };
}

interface ProviderEntry {
  id: ProviderId;
  service: HistoryService;
}

// Order here is the order rows are returned in. The leaderboard re-sorts by
// success rate; head-to-head consumers can read this slice directly.
const PROVIDERS_WITH_FEED: ReadonlyArray<ProviderEntry> = [
  { id: ProviderId.Across, service: acrossHistoryService },
  { id: ProviderId.Relay, service: relayHistoryService },
  { id: ProviderId.Lifi, service: lifiIntentsHistoryService },
];

/**
 * True when no provider returned usable data: every row is null-filled (or
 * the array is empty). A row with `fillCount: 0` is real data (a provider
 * that answered with zero fills) and does not count as failed.
 */
export function allProvidersFailed(metrics: readonly ProviderMetrics[]): boolean {
  return metrics.every((row) => row.fillCount === null);
}

/**
 * Null-filled rows for every provider, in the same order `fetchProviderMetrics`
 * returns them. Callers use this to keep the table structure when the whole
 * fetch fails, instead of rendering zero rows.
 */
export function emptyProviderMetrics(): ProviderMetrics[] {
  return [...PROVIDERS_WITH_FEED.map(({ id }) => nullMetricsFor(id)), nullMetricsFor(ProviderId.Bungee)];
}

/**
 * Fans out a `HistoryQuery` across every provider that publishes a public
 * history feed, aggregates each response into `ProviderMetrics`, and appends
 * the Bungee placeholder. A provider that throws, rejects, or stalls past
 * `PROVIDER_TIMEOUT_MS` returns a null-filled row so the UI keeps rendering
 * the rest.
 *
 * Both the leaderboard (ambient 24h) and head-to-head (per-route) consume the
 * same shape; the caller decides the query.
 */
export async function fetchProviderMetrics(query: HistoryQuery): Promise<ProviderMetrics[]> {
  const settled = await Promise.allSettled(
    PROVIDERS_WITH_FEED.map(async ({ id, service }) => {
      const result = await withTimeout(service.getHistory(query), PROVIDER_TIMEOUT_MS, `${id}_HISTORY_TIMEOUT`);
      return aggregateProviderSamples(id, result.samples);
    }),
  );

  const metrics: ProviderMetrics[] = settled.map((outcome, index) => {
    const { id } = PROVIDERS_WITH_FEED[index];
    if (outcome.status === 'fulfilled') return outcome.value;
    return nullMetricsFor(id);
  });

  metrics.push(nullMetricsFor(ProviderId.Bungee));
  return metrics;
}
