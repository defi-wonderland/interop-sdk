import { EXECUTION_STATUS, type OrderExecutionState, type OrderExecutionStatus } from '../../types/execution';
import type { OrderApiStatusUpdate } from '@wonderland/interop-cross-chain';
import type { Hex } from 'viem';

function customizeMessage(update: OrderApiStatusUpdate): string {
  const { status, message } = update;

  switch (status) {
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
  update: OrderApiStatusUpdate,
  txHash: Hex,
  originChainId: number,
  destinationChainId: number,
): OrderExecutionState {
  return {
    status: update.status as OrderExecutionStatus,
    message: customizeMessage(update),
    txHash,
    fillTxHash: update.fillTxHash,
    orderId: update.orderId,
    originChainId,
    destinationChainId,
  };
}
