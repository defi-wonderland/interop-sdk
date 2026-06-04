import { ProviderId } from '../providers';
import type { ProviderMetrics } from '../types/historyMetrics';

/**
 * Fixture mirroring the Pencil design for Section 03 (arbitrum → base, USDC):
 * - relay wins FASTEST + CHEAPEST
 * - across wins MOST ACTIVE
 * - lifi has data but no category win
 * - bungee is the no-global-feed placeholder
 */
export const MOCK_HEAD_TO_HEAD_METRICS: ProviderMetrics[] = [
  {
    providerId: ProviderId.Relay,
    fillCount: 287,
    successRate: 0.997,
    p50FillSeconds: 1.2,
    p99FillSeconds: 3.6,
    avgFeeUsd: 0.14,
    volumeUsd: 482_300,
  },
  {
    providerId: ProviderId.Across,
    fillCount: 342,
    successRate: 0.994,
    p50FillSeconds: 1.8,
    p99FillSeconds: 6.2,
    avgFeeUsd: 0.31,
    volumeUsd: 615_700,
  },
  {
    providerId: ProviderId.Lifi,
    fillCount: 198,
    successRate: 0.972,
    p50FillSeconds: 4.1,
    p99FillSeconds: 14.5,
    avgFeeUsd: 0.62,
    volumeUsd: 391_200,
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
