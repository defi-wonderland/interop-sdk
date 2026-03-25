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
    (state.action === WALLET_ACTION.SIGNING ||
      state.action === WALLET_ACTION.SUBMITTING ||
      state.action === WALLET_ACTION.CONFIRMING)
  );
}

/**
 * Map SDK OrderStatus to a human-readable label.
 * Statuses from oif-specs OrderStatus enum:
 *   created → pending → executing → executed → settling → settled → finalized
 *   With failure paths: pending/executing → failed, settled → refunded
 */
function humanizeOrderStatus(status: OrderStatus): string {
  switch (status) {
    case OrderStatus.Created:
      return 'Order created';
    case OrderStatus.Pending:
      return 'Awaiting solver';
    case OrderStatus.Executing:
      return 'Solver executing';
    case OrderStatus.Executed:
      return 'Executed';
    case OrderStatus.Settling:
      return 'Settling';
    case OrderStatus.Settled:
      return 'Settled';
    case OrderStatus.Finalized:
      return 'Complete';
    case OrderStatus.Failed:
      return 'Failed';
    case OrderStatus.Refunded:
      return 'Refunded';
    default:
      return formatOrderStatus(status);
  }
}

/**
 * Get display label for current state
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
        case WALLET_ACTION.SIGNING:
          return 'Signing';
        case WALLET_ACTION.SUBMITTING:
          return 'Submitting';
        case WALLET_ACTION.CONFIRMING:
          return 'Confirming';
      }
    case STEP.TRACKING:
      return humanizeOrderStatus(state.update.status);
    case STEP.DONE:
      return 'Complete';
    case STEP.TIMEOUT:
      return 'Timed out';
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
      case WALLET_ACTION.SIGNING:
        return 'Please sign the order in your wallet...';
      case WALLET_ACTION.SUBMITTING:
        return 'Submitting order to solver...';
      case WALLET_ACTION.CONFIRMING:
        return 'Waiting for transaction confirmation...';
    }
  }

  if (state.step === STEP.TRACKING) {
    return humanizeTrackingMessage(state.update.status, state.update.message);
  }

  return undefined;
}

/**
 * Provide a human-readable progress message for each tracking status.
 * Falls back to the SDK message for unknown states.
 */
function humanizeTrackingMessage(status: OrderStatus, sdkMessage?: string): string {
  switch (status) {
    case OrderStatus.Created:
      return 'Order recorded, waiting for validation...';
    case OrderStatus.Pending:
      return 'Waiting for a solver to pick up your order...';
    case OrderStatus.Executing:
      return 'Solver is submitting transactions...';
    case OrderStatus.Executed:
      return 'Transactions submitted, waiting for settlement...';
    case OrderStatus.Settling:
      return 'Settlement in progress...';
    case OrderStatus.Settled:
      return 'Assets settled, finalizing...';
    case OrderStatus.Finalized:
      return 'Order complete.';
    case OrderStatus.Failed:
      return sdkMessage ?? 'Order failed.';
    case OrderStatus.Refunded:
      return 'Order refunded. Tokens returned to your wallet on the origin chain.';
    default:
      return sdkMessage ?? '';
  }
}

/**
 * Format OrderStatus enum value for display (capitalize)
 */
function formatOrderStatus(status: OrderStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}
