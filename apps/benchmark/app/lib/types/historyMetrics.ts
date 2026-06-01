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
  successRate: number | null;
  p50FillSeconds: number | null;
  p99FillSeconds: number | null;
  avgFeeUsd: number | null;
  volumeUsd: number | null;
}
