import { ProviderId } from './providers';
import type { HistorySample, ProviderMetrics } from './types/historyMetrics';

export function percentile(values: readonly number[], p: number): number | null {
  if (values.length === 0) return null;
  if (!Number.isFinite(p)) return null;
  const clamped = Math.max(0, Math.min(100, p));
  const sorted = [...values].sort((a, b) => a - b);
  const rank = (clamped / 100) * (sorted.length - 1);
  const low = Math.floor(rank);
  const high = Math.ceil(rank);
  if (low === high) return sorted[low];
  return sorted[low] + (sorted[high] - sorted[low]) * (rank - low);
}

export function aggregateProviderSamples(providerId: ProviderId, samples: readonly HistorySample[]): ProviderMetrics {
  if (samples.length === 0) {
    return {
      providerId,
      fillCount: 0,
      successRate: null,
      p50FillSeconds: null,
      p99FillSeconds: null,
      avgFeeUsd: null,
      volumeUsd: null,
    };
  }

  const fillCount = samples.length;
  // Exclude pending samples from the success-rate denominator: services normalize
  // in-flight states to 'pending' and counting them as failures would push the
  // rate toward 0 for providers with mostly outstanding fills.
  const resolved = samples.filter((s) => s.status !== 'pending');
  const filled = resolved.filter((s) => s.status === 'success').length;
  const successRate = resolved.length === 0 ? null : filled / resolved.length;

  const fillTimes = samples.map((s) => s.fillTimeSeconds).filter((v): v is number => v !== null);
  const fees = samples.map((s) => s.feeUsd).filter((v): v is number => v !== null);
  const volumes = samples.map((s) => s.amountUsd).filter((v): v is number => v !== null);

  return {
    providerId,
    fillCount,
    successRate,
    p50FillSeconds: percentile(fillTimes, 50),
    p99FillSeconds: percentile(fillTimes, 99),
    avgFeeUsd: fees.length === 0 ? null : fees.reduce((a, b) => a + b, 0) / fees.length,
    volumeUsd: volumes.length === 0 ? null : volumes.reduce((a, b) => a + b, 0),
  };
}

export function sortLeaderboardBySuccess(metrics: readonly ProviderMetrics[]): ProviderMetrics[] {
  return [...metrics].sort((a, b) => {
    if (a.successRate === null && b.successRate === null) return 0;
    if (a.successRate === null) return 1;
    if (b.successRate === null) return -1;
    return b.successRate - a.successRate;
  });
}
