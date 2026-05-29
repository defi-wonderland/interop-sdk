import { ProviderId } from '../providers';
import type { ProviderMetrics } from '../types/historyMetrics';

export const MOCK_LEADERBOARD_METRICS: ProviderMetrics[] = [
  {
    providerId: ProviderId.Relay,
    fillCount: 956,
    successRate: 0.992,
    p50FillSeconds: 1.4,
    p99FillSeconds: 4.8,
    avgFeeUsd: 0.18,
    volumeUsd: 1_842_500,
  },
  {
    providerId: ProviderId.Across,
    fillCount: 1284,
    successRate: 0.987,
    p50FillSeconds: 2.1,
    p99FillSeconds: 8.4,
    avgFeeUsd: 0.42,
    volumeUsd: 2_410_900,
  },
  {
    providerId: ProviderId.Lifi,
    fillCount: 2103,
    successRate: 0.968,
    p50FillSeconds: 4.8,
    p99FillSeconds: 18.2,
    avgFeeUsd: 0.71,
    volumeUsd: 3_120_400,
  },
  {
    providerId: ProviderId.Bungee,
    fillCount: null,
    successRate: null,
    p50FillSeconds: null,
    p99FillSeconds: null,
    avgFeeUsd: null,
    volumeUsd: null,
  },
];
