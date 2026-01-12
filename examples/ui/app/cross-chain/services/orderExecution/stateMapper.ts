import { OrderStatusOrExpired, type OrderTrackingUpdate } from '@wonderland/interop-cross-chain';
import { EXECUTION_STATUS, type OrderExecutionState, type OrderExecutionStatus } from '../../types/execution';
import type { Hex } from 'viem';

const SDK_TO_UI_STATUS: Record<string, OrderExecutionStatus> = {
  [OrderStatusOrExpired.Pending]: EXECUTION_STATUS.PENDING,
  [OrderStatusOrExpired.Executing]: EXECUTION_STATUS.FILLING,
  [OrderStatusOrExpired.Finalized]: EXECUTION_STATUS.COMPLETED,
  [OrderStatusOrExpired.Failed]: EXECUTION_STATUS.FAILED,
  [OrderStatusOrExpired.Expired]: EXECUTION_STATUS.EXPIRED,
};

function mapSdkStatusToUi(sdkStatus: string): OrderExecutionStatus {
  return SDK_TO_UI_STATUS[sdkStatus] ?? (sdkStatus as OrderExecutionStatus);
}

function customizeMessage(update: OrderTrackingUpdate, uiStatus: OrderExecutionStatus): string {
  const { message } = update;

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
      return message || 'Order execution failed';

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
  const uiStatus = mapSdkStatusToUi(update.status);
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
