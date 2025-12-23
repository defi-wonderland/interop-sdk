import type { Hex } from 'viem';

/**
 * Execution status constants - single source of truth
 * Combines UI-specific states (approval, transaction) with SDK tracking states
 */
export const EXECUTION_STATUS = {
  // UI-specific states (before tracking begins)
  IDLE: 'idle',
  CHECKING_APPROVAL: 'checking-approval',
  APPROVING: 'approving',
  SUBMITTING: 'submitting',
  CONFIRMING: 'confirming',
  // SDK tracking states (from IntentTracker)
  OPENING: 'opening',
  OPENED: 'opened',
  FILLING: 'filling',
  FILLED: 'filled',
  EXPIRED: 'expired',
  // Error state
  ERROR: 'error',
} as const;

/**
 * Execution status type - derived from constants
 */
export type IntentExecutionStatus = (typeof EXECUTION_STATUS)[keyof typeof EXECUTION_STATUS];

export interface IntentExecutionState {
  status: IntentExecutionStatus;
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
