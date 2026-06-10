import { aggregateProviderSamples } from '../historyAggregation';
import { ProviderId } from '../providers';
import { acrossHistoryService, lifiIntentsHistoryService, relayHistoryService } from '.';
import type { HistoryService } from '../interfaces/historyService.interface';
import type { HistoryQuery, HistorySample, ProviderMetrics } from '../types/historyMetrics';

// Fetch each provider's routes in waves of this size, not all at once: the
// leaderboard fans every network route across each provider, and one host
// rate-limits under the full burst. Each request carries its own
// AbortController timeout (FetchHttpClient), so a hung route is cancelled, not
// just abandoned.
const ROUTE_CONCURRENCY = 3;

// Shared wall-clock budget for the whole fan-out. Bounds regeneration when an
// upstream is slow: a provider that crosses it stops launching new route waves
// and yields whatever it gathered (partial), instead of blocking the others or
// firing more requests in the background.
const PROVIDER_BUDGET_MS = 45_000;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

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
 * Pools one provider's raw samples across its routes (fetched in waves of
 * `ROUTE_CONCURRENCY`) and aggregates once. A failed route is dropped; a route
 * that answers with zero fills still counts, so a genuine empty answer keeps
 * its row instead of collapsing to null.
 *
 * `deadline` is a shared wall-clock cutoff (epoch ms): once it passes, no new
 * wave launches. The in-flight wave is already bounded by each request's client
 * timeout, so crossing the budget yields a partial aggregate rather than
 * stranding work or issuing more requests.
 */
export async function aggregateProviderRoutes(
  id: ProviderId,
  service: HistoryService,
  queries: readonly HistoryQuery[],
  deadline: number,
): Promise<ProviderMetrics> {
  const samples: HistorySample[] = [];
  const failures: string[] = [];
  let okCount = 0;

  for (let i = 0; i < queries.length; i += ROUTE_CONCURRENCY) {
    if (Date.now() >= deadline) {
      failures.push(`budget exhausted after ${i}/${queries.length} routes`);
      break;
    }
    const wave = queries.slice(i, i + ROUTE_CONCURRENCY);
    const settled = await Promise.allSettled(wave.map((query) => service.getHistory(query)));
    settled.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        okCount += 1;
        samples.push(...result.value.samples);
      } else {
        const { originChainId, destinationChainId } = wave[index];
        failures.push(`${originChainId}->${destinationChainId} (${errorMessage(result.reason)})`);
      }
    });
  }

  if (failures.length > 0) {
    // Name the dropped routes and their cause so a partial aggregate is debuggable.
    console.warn(`${id}: ${failures.length}/${queries.length} routes degraded: ${failures.join(', ')}`);
  }
  // No route succeeded: null row, not a fake zero (a real zero-fill answer keeps its row).
  if (okCount === 0) return nullMetricsFor(id);
  return aggregateProviderSamples(id, samples);
}

/**
 * Pools each provider's raw samples across all the given routes and aggregates
 * once, so percentiles come from the combined pool. All providers share one
 * `PROVIDER_BUDGET_MS` wall-clock budget; a provider that crosses it stops
 * launching new route waves and yields a partial (or null) row while the others
 * keep their results. Appends the Bungee placeholder.
 */
export async function fetchAggregatedProviderMetrics(queries: readonly HistoryQuery[]): Promise<ProviderMetrics[]> {
  // Compute the cutoff once so every provider gets the same wall-clock window.
  const deadline = Date.now() + PROVIDER_BUDGET_MS;
  const metrics = await Promise.all(
    PROVIDERS_WITH_FEED.map(({ id, service }) =>
      aggregateProviderRoutes(id, service, queries, deadline).catch(() => nullMetricsFor(id)),
    ),
  );

  metrics.push(nullMetricsFor(ProviderId.Bungee));
  return metrics;
}

/** Single-route convenience wrapper, used by head-to-head. */
export function fetchProviderMetrics(query: HistoryQuery): Promise<ProviderMetrics[]> {
  return fetchAggregatedProviderMetrics([query]);
}
