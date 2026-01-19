import { STEP, type BridgeState } from '../../types/execution';

export interface OrderTrackingProps {
  state: BridgeState;
  onReset?: () => void;
}

/** Props for SuccessView - only accepts 'done' step */
export interface SuccessViewProps {
  state: Extract<BridgeState, { step: typeof STEP.DONE }>;
  onReset?: () => void;
}

/** Props for ErrorView - accepts 'timeout' or 'error' steps */
export interface ErrorViewProps {
  state: Extract<BridgeState, { step: typeof STEP.TIMEOUT }> | Extract<BridgeState, { step: typeof STEP.ERROR }>;
  onReset?: () => void;
}

/** Props for ProgressView - accepts 'wallet' or 'tracking' steps */
export interface ProgressViewProps {
  state: Extract<BridgeState, { step: typeof STEP.WALLET }> | Extract<BridgeState, { step: typeof STEP.TRACKING }>;
}
