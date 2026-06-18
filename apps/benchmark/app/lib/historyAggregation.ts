import { ProviderId } from './providers';
import type { HistorySample, ProviderMetrics } from './types/historyMetrics';

export function percentile(values: readonly number[], p: number): number | null {
  if (!Number.isFinite(p)) return null;
  // Strip non-finite (NaN, ±Infinity) so they cannot poison the sort or
  // propagate through downstream formatters.
  const clean = values.filter((v) => Number.isFinite(v));
  if (clean.length === 0) return null;
  const clamped = Math.max(0, Math.min(100, p));
  const sorted = [...clean].sort((a, b) => a - b);
  const rank = (clamped / 100) * (sorted.length - 1);
  const low = Math.floor(rank);
  const high = Math.ceil(rank);
  if (low === high) return sorted[low];
  return sorted[low] + (sorted[high] - sorted[low]) * (rank - low);
}

export function aggregateProviderSamples(providerId: ProviderId, samples: readonly HistorySample[]): ProviderMetrics {
  // Defend against callers passing mixed feeds: only count samples that
  // actually belong to this providerId. Cheap guard, catches a real footgun.
  const owned = samples.filter((s) => s.providerId === providerId);

  const fillCount = owned.length;
  // Exclude pending samples from the success-rate denominator: services normalize
  // in-flight states to 'pending' and counting them as failures would push the
  // rate toward 0 for providers with mostly outstanding fills.
  const resolved = owned.filter((s) => s.status !== 'pending');
  const filled = resolved.filter((s) => s.status === 'success').length;
  const successRate = resolved.length === 0 ? null : filled / resolved.length;

  const fillTimes = owned.map((s) => s.fillTimeSeconds).filter((v): v is number => v !== null);
  // Size-normalized fee: per-sample fee as a % of the intent amount. Skip samples
  // missing either side, and drop negatives (Across swap-surplus can report a
  // negative feeUsd, which is not a fee). Median rather than mean so outliers and
  // any remaining noise don't drag the typical value around.
  const feePercents = owned
    .filter((s) => s.feeUsd !== null && s.amountUsd !== null && s.amountUsd > 0 && s.feeUsd >= 0)
    .map((s) => ((s.feeUsd as number) / (s.amountUsd as number)) * 100);
  const volumes = owned.map((s) => s.amountUsd).filter((v): v is number => v !== null);

  return {
    providerId,
    fillCount,
    sampleWindowSeconds: sampleWindowSeconds(owned),
    successRate,
    p50FillSeconds: percentile(fillTimes, 50),
    p99FillSeconds: percentile(fillTimes, 99),
    feePercent: percentile(feePercents, 50),
    medianSizeUsd: percentile(volumes, 50),
    volumeUsd: volumes.length === 0 ? null : volumes.reduce((a, b) => a + b, 0),
  };
}

// Seconds from the oldest to the newest sampled fill. Needs at least two
// timestamps to form a span; a single fill (or none) has no window, so report
// null instead of a misleading 0.
function sampleWindowSeconds(samples: readonly HistorySample[]): number | null {
  const timestamps = samples.map((s) => s.timestamp).filter((t) => Number.isFinite(t));
  if (timestamps.length < 2) return null;
  return (Math.max(...timestamps) - Math.min(...timestamps)) / 1000;
}

export function sortLeaderboardBySuccess(metrics: readonly ProviderMetrics[]): ProviderMetrics[] {
  // Compare via `<`/`>` instead of subtraction: when two providers both lack a
  // success rate, `-Infinity - -Infinity` is NaN and a NaN comparator returns
  // undefined sort behavior in V8.
  const compare = (a: number, b: number): number => (a > b ? -1 : a < b ? 1 : 0);
  const score = (m: ProviderMetrics): number => m.successRate ?? -Infinity;
  const activity = (m: ProviderMetrics): number => m.fillCount ?? -1;
  return [...metrics].sort((a, b) => compare(score(a), score(b)) || compare(activity(a), activity(b)));
}
