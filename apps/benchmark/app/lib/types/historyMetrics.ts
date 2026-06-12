import { ProviderId } from '../providers';
import type { Address } from 'viem';

export type HistorySampleStatus = 'success' | 'failed' | 'pending';

export interface HistorySample {
  providerId: string;
  timestamp: number;
  status: HistorySampleStatus;
  amountUsd: number | null;
  feeUsd: number | null;
  fillTimeSeconds: number | null;
}

export interface HistoryQuery {
  originChainId: number;
  destinationChainId: number;
  tokenAddress?: Address;
  limit?: number;
  tokenDecimals?: Record<string, number>;
}

export interface HistoryResult {
  providerId: string;
  samples: HistorySample[];
}

export interface ProviderMetrics {
  providerId: ProviderId;
  fillCount: number | null;
  // Seconds between the oldest and newest sampled fill: how far back this
  // provider's sample reaches. Null when fewer than two fills make a span.
  sampleWindowSeconds: number | null;
  successRate: number | null;
  p50FillSeconds: number | null;
  p99FillSeconds: number | null;
  // Typical fee as a percentage of intent size: the median of per-sample
  // feeUsd/amountUsd. Size-normalized so it's comparable across providers.
  feePercent: number | null;
  volumeUsd: number | null;
}
