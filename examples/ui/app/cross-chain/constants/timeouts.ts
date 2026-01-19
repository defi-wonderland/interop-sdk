/**
 * Timeout constants used throughout the cross-chain execution flow.
 * All values are in milliseconds.
 */
export const TIMEOUT_MS = {
  APPROVAL_VERIFICATION: 2000,
  TX_RETRY: 3000,
  BLOCK_CONFIRMATION_WAIT: 5000,
  INTENT_TRACKING_TIMEOUT: 10 * 60 * 1000,
} as const;
