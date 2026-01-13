import type { Hex } from 'viem';

/**
 * Execution status constants - single source of truth
 * Combines UI-specific states (approval, transaction) with SDK tracking states (OIF-aligned)
 * @see https://docs.openintents.xyz/docs/apis/order-api#order-statuses
 */
export const EXECUTION_STATUS = {
  IDLE: 'idle',
  SWITCHING_NETWORK: 'switching-network',
  CHECKING_APPROVAL: 'checking-approval',
  APPROVING: 'approving',
  SUBMITTING: 'submitting',
  CONFIRMING: 'confirming',
  PENDING: 'pending',
  FILLING: 'filling',
  COMPLETED: 'completed',
  FAILED: 'failed',
  EXPIRED: 'expired',
  TIMEOUT: 'timeout',
  ERROR: 'error',
} as const;

/**
 * Execution status type - derived from constants
 */
export type OrderExecutionStatus = (typeof EXECUTION_STATUS)[keyof typeof EXECUTION_STATUS];

export interface OrderExecutionState {
  status: OrderExecutionStatus;
  message: string;
  txHash?: Hex;
  fillTxHash?: Hex;
  orderId?: Hex;
  error?: Error;
  originChainId?: number;
  destinationChainId?: number;
}

export interface ExecuteResult {
  success: boolean;
  userRejected?: boolean;
}
