import { OrderStatus } from '@wonderland/interop-cross-chain';
import { STEP, WALLET_ACTION, type BridgeState } from '../types/execution';

/**
 * Check if wallet action belongs to approval phase
 */
export function isApprovalPhase(state: BridgeState): boolean {
  return (
    state.step === STEP.WALLET &&
    (state.action === WALLET_ACTION.SWITCHING ||
      state.action === WALLET_ACTION.CHECKING ||
      state.action === WALLET_ACTION.APPROVING)
  );
}

/**
 * Check if wallet action belongs to submit phase
 */
export function isSubmitPhase(state: BridgeState): boolean {
  return (
    state.step === STEP.WALLET &&
    (state.action === WALLET_ACTION.SUBMITTING || state.action === WALLET_ACTION.CONFIRMING)
  );
}

/**
 * Get display label for current state - uses SDK OrderStatus directly when tracking
 */
export function getStateLabel(state: BridgeState): string {
  switch (state.step) {
    case STEP.WALLET:
      switch (state.action) {
        case WALLET_ACTION.SWITCHING:
          return 'Switching Network';
        case WALLET_ACTION.CHECKING:
          return 'Checking Approval';
        case WALLET_ACTION.APPROVING:
          return 'Approving';
        case WALLET_ACTION.SUBMITTING:
          return 'Submitting';
        case WALLET_ACTION.CONFIRMING:
          return 'Confirming';
      }
    case STEP.TRACKING:
      // Display SDK OrderStatus directly
      return formatOrderStatus(state.update.status);
    case STEP.DONE:
      return formatOrderStatus(OrderStatus.Finalized);
    case STEP.TIMEOUT:
      return 'Timeout';
    case STEP.ERROR:
      return 'Error';
    default:
      return '';
  }
}

/**
 * Get progress message for current state
 */
export function getProgressMessage(state: BridgeState): string | undefined {
  if (state.step === STEP.WALLET) {
    switch (state.action) {
      case WALLET_ACTION.SWITCHING:
        return 'Please switch to the origin chain in your wallet...';
      case WALLET_ACTION.CHECKING:
        return 'Checking token allowance...';
      case WALLET_ACTION.APPROVING:
        return state.txHash
          ? 'Waiting for approval confirmation...'
          : 'Please approve token spending in your wallet...';
      case WALLET_ACTION.SUBMITTING:
        return 'Please confirm the bridge transaction in your wallet...';
      case WALLET_ACTION.CONFIRMING:
        return 'Waiting for transaction confirmation...';
    }
  }

  if (state.step === STEP.TRACKING) {
    return state.update.message;
  }

  return undefined;
}

/**
 * Format OrderStatus enum value for display (capitalize)
 */
function formatOrderStatus(status: OrderStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}
