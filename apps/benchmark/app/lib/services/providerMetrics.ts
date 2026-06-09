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
 * Fans every provider's history feed across one or more `HistoryQuery`s, pools
 * each provider's raw samples across all the queries, and aggregates once into
 * `ProviderMetrics`. Percentiles come from the combined sample pool, not an
 * average of per-query percentiles. Appends the Bungee placeholder. A query
 * that throws, rejects, or stalls past `PROVIDER_TIMEOUT_MS` is dropped; a
 * provider whose every query failed gets a null-filled row so the UI keeps
 * rendering the rest.
 *
 * The leaderboard passes every network route for an aggregate view;
 * head-to-head passes a single route.
 */
export async function fetchAggregatedProviderMetrics(queries: readonly HistoryQuery[]): Promise<ProviderMetrics[]> {
  const metrics = await Promise.all(
    PROVIDERS_WITH_FEED.map(async ({ id, service }) => {
      const settled = await Promise.allSettled(
        queries.map((query) => withTimeout(service.getHistory(query), PROVIDER_TIMEOUT_MS, `${id}_HISTORY_TIMEOUT`)),
      );
      const fulfilled = settled.filter((outcome) => outcome.status === 'fulfilled');
      // Every route failed for this provider: surface a null row rather than a
      // fake zero-activity one.
      if (fulfilled.length === 0) return nullMetricsFor(id);
      const samples = fulfilled.flatMap((outcome) => outcome.value.samples);
      return aggregateProviderSamples(id, samples);
    }),
  );

  metrics.push(nullMetricsFor(ProviderId.Bungee));
  return metrics;
}

/**
 * Single-route convenience wrapper, used by head-to-head.
 */
export function fetchProviderMetrics(query: HistoryQuery): Promise<ProviderMetrics[]> {
  return fetchAggregatedProviderMetrics([query]);
}
