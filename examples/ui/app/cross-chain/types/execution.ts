import type { OrderTrackerTimeoutPayload, OrderTrackingUpdate } from '@wonderland/interop-cross-chain';
import type { Hex } from 'viem';

/**
 * Bridge execution steps - use these constants instead of string literals
 */
export const STEP = {
  IDLE: 'idle',
  WALLET: 'wallet',
  TRACKING: 'tracking',
  DONE: 'done',
  TIMEOUT: 'timeout',
  ERROR: 'error',
} as const;

export type Step = (typeof STEP)[keyof typeof STEP];

/**
 * Wallet actions - use these constants instead of string literals
 */
export const WALLET_ACTION = {
  SWITCHING: 'switching',
  CHECKING: 'checking',
  APPROVING: 'approving',
  SUBMITTING: 'submitting',
  CONFIRMING: 'confirming',
} as const;

export type WalletAction = (typeof WALLET_ACTION)[keyof typeof WALLET_ACTION];

/**
 * Chain context for tracking steps
 */
export interface ChainContext {
  originChainId: number;
  destinationChainId: number;
}

/**
 * Minimal 6-variant discriminated union for bridge execution state
 *
 * - idle: Initial state
 * - wallet: User wallet interactions (network switch, approval, tx submission)
 * - tracking: Order is being tracked via SDK
 * - done: Order finalized successfully
 * - timeout: SDK tracking timed out (order may still complete)
 * - error: Any error occurred
 */
export type BridgeState =
  | { step: typeof STEP.IDLE }
  | ({ step: typeof STEP.WALLET; action: WalletAction; txHash?: Hex } & Partial<ChainContext>)
  | ({ step: typeof STEP.TRACKING; update: OrderTrackingUpdate; txHash: Hex } & ChainContext)
  | ({ step: typeof STEP.DONE; update: OrderTrackingUpdate; txHash: Hex } & ChainContext)
  | ({
      step: typeof STEP.TIMEOUT;
      update: OrderTrackingUpdate;
      timeout: OrderTrackerTimeoutPayload;
      txHash: Hex;
    } & ChainContext)
  | ({
      step: typeof STEP.ERROR;
      error: Error;
      message: string;
      txHash?: Hex;
      lastUpdate?: OrderTrackingUpdate;
    } & Partial<ChainContext>);

/**
 * Type guard: check if state is in wallet step
 */
export const isWalletStep = (s: BridgeState): s is Extract<BridgeState, { step: typeof STEP.WALLET }> =>
  s.step === STEP.WALLET;

/**
 * Type guard: check if state is in tracking phase (has SDK update)
 */
export const isTracking = (s: BridgeState): s is Extract<BridgeState, { update: OrderTrackingUpdate }> =>
  s.step === STEP.TRACKING || s.step === STEP.DONE || s.step === STEP.TIMEOUT;

/**
 * Type guard: check if state is terminal (done, timeout, or error)
 */
export const isTerminal = (s: BridgeState): boolean =>
  s.step === STEP.DONE || s.step === STEP.TIMEOUT || s.step === STEP.ERROR;

/**
 * Result of execute operation
 */
export interface ExecuteResult {
  success: boolean;
  userRejected?: boolean;
}
