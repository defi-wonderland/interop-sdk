import type { Address } from 'viem';

export interface HistorySample {
  providerId: string;
  timestamp: number;
  amountUsd: number;
  feeUsd: number;
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
