import { aggregateProviderSamples } from '../historyAggregation';
import { ProviderId } from '../providers';
import { acrossHistoryService, lifiIntentsHistoryService, relayHistoryService } from '.';
import type { HistoryService } from '../interfaces/historyService.interface';
import type { HistoryQuery, HistorySample, ProviderMetrics } from '../types/historyMetrics';

// Each history service's `FetchHttpClient` bounds every request with an
// AbortController-backed timeout, so a hung route is cancelled at the transport
// level, not just abandoned. That keeps the concurrency cap below honest: a
// worker frees its slot only once the request truly settles.

// Cap how many routes a single provider fetches at once. The leaderboard fans
// every network route across each provider; without a cap that hits one host
// with all of them concurrently (each paginating, with GET retries), inviting
// rate limits. Routes are processed in waves of this size instead.
const ROUTE_CONCURRENCY = 3;

// Runs `task` over `items` with at most `limit` in flight at a time.
async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const runWorker = async (): Promise<void> => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await task(items[index]);
    }
  };
  const workers = Array.from({ length: Math.min(limit, items.length) }, runWorker);
  await Promise.all(workers);
  return results;
}

function routeLabel(query: HistoryQuery): string {
  return `${query.originChainId}->${query.destinationChainId}`;
}

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
 * Fans every provider's history feed across one or more `HistoryQuery`s, pools
 * each provider's raw samples across all the queries, and aggregates once into
 * `ProviderMetrics`. Percentiles come from the combined sample pool, not an
 * average of per-query percentiles. Appends the Bungee placeholder. A query
 * that throws, rejects, or times out (cancelled by the client) is dropped; a
 * provider whose every query failed gets a null-filled row so the UI keeps
 * rendering the rest.
 *
 * The leaderboard passes every network route for an aggregate view;
 * head-to-head passes a single route.
 */
export async function fetchAggregatedProviderMetrics(queries: readonly HistoryQuery[]): Promise<ProviderMetrics[]> {
  const metrics = await Promise.all(
    PROVIDERS_WITH_FEED.map(async ({ id, service }) => {
      const outcomes = await mapWithConcurrency(queries, ROUTE_CONCURRENCY, (query) =>
        service.getHistory(query).then(
          (result) => ({ ok: true as const, samples: result.samples }),
          (error: unknown) => ({ ok: false as const, query, error }),
        ),
      );

      const samples: HistorySample[] = [];
      const failures: string[] = [];
      let okCount = 0;
      for (const outcome of outcomes) {
        if (outcome.ok) {
          okCount += 1;
          samples.push(...outcome.samples);
        } else {
          failures.push(`${routeLabel(outcome.query)} (${errorMessage(outcome.error)})`);
        }
      }
      if (failures.length > 0) {
        // Name the dropped routes and their cause so a partial aggregate is
        // debuggable instead of silently based on a subset.
        console.warn(`${id}: ${failures.length}/${queries.length} routes failed: ${failures.join(', ')}`);
      }
      // Every route failed for this provider: surface a null row rather than a
      // fake zero-activity one. A provider that answered with zero fills keeps
      // its real (zero) row.
      if (okCount === 0) return nullMetricsFor(id);
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
