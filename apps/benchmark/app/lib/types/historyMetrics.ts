import { ProviderId } from '../providers';

export type FillStatus = 'filled' | 'expired' | 'refunded';

export interface HistorySample {
  providerId: ProviderId;
  status: FillStatus;
  fillTimeSeconds: number | null;
  feeUsd: number | null;
  amountUsd: number | null;
  timestamp: number;
}

export interface ProviderMetrics {
  providerId: ProviderId;
  fillCount: number;
  successRate: number | null;
  p50FillSeconds: number | null;
  p99FillSeconds: number | null;
  avgFeeUsd: number | null;
  volumeUsd: number | null;
}
