import { OrderFailureReason, OrderStatus, type OrderTrackingUpdate } from '@wonderland/interop-cross-chain';
import { EXECUTION_STATUS, type OrderExecutionState, type OrderExecutionStatus } from '../../types/execution';
import type { Hex } from 'viem';

const SDK_TO_UI_STATUS: Record<string, OrderExecutionStatus> = {
  [OrderStatus.Pending]: EXECUTION_STATUS.PENDING,
  [OrderStatus.Executing]: EXECUTION_STATUS.FILLING,
  [OrderStatus.Finalized]: EXECUTION_STATUS.COMPLETED,
  [OrderStatus.Failed]: EXECUTION_STATUS.FAILED,
};

function mapSdkStatusToUi(sdkStatus: string, failureReason?: string): OrderExecutionStatus {
  if (sdkStatus === OrderStatus.Failed && failureReason === OrderFailureReason.DeadlineExceeded) {
    return EXECUTION_STATUS.EXPIRED;
  }
  return SDK_TO_UI_STATUS[sdkStatus] ?? (sdkStatus as OrderExecutionStatus);
}

function customizeMessage(update: OrderTrackingUpdate, uiStatus: OrderExecutionStatus): string {
  const { message, failureReason } = update;

  switch (uiStatus) {
    case EXECUTION_STATUS.FILLING:
      if (message.includes('Waiting for solver')) {
        return 'Waiting for solver to fill order on destination chain...';
      }
      if (message.includes('Stopped watching')) {
        return 'Stopped watching, but the order may still be filled by a solver.';
      }
      return message;

    case EXECUTION_STATUS.COMPLETED:
      if (message.includes('Order completed in block')) {
        const blockMatch = message.match(/block (\d+)/);
        const blockNumber = blockMatch ? blockMatch[1] : 'unknown';
        return `Order completed by solver in block ${blockNumber} on destination chain`;
      }
      return message;

    case EXECUTION_STATUS.FAILED:
      if (failureReason === OrderFailureReason.DeadlineExceeded) {
        return message || 'Order deadline exceeded';
      }
      return message || 'Order execution failed';

    case EXECUTION_STATUS.EXPIRED:
      return message || 'Order deadline exceeded';

    default:
      return message;
  }
}

export function mapOrderUpdateToState(
  update: OrderTrackingUpdate,
  txHash: Hex,
  originChainId: number,
  destinationChainId: number,
): OrderExecutionState {
  const uiStatus = mapSdkStatusToUi(update.status, update.failureReason);
  return {
    status: uiStatus,
    message: customizeMessage(update, uiStatus),
    txHash,
    fillTxHash: update.fillTxHash,
    orderId: update.orderId,
    originChainId,
    destinationChainId,
  };
}
