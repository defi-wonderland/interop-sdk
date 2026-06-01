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
