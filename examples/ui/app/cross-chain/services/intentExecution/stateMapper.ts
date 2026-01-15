import { EXECUTION_STATUS, type IntentExecutionState, type IntentExecutionStatus } from '../../types/execution';
import type { IntentUpdate } from '@wonderland/interop-cross-chain';
import type { Hex } from 'viem';

/**
 * Customize SDK messages for better UX in the demo
 * - Uses "solver" instead of "relayer"
 * - Adds chain context to messages
 */
function customizeMessage(update: IntentUpdate): string {
  const { status, message } = update;

  switch (status) {
    case EXECUTION_STATUS.FILLING:
      // Replace "relayer" with "solver" and add context
      if (message.includes('Waiting for relayer')) {
        return 'Waiting for solver to fill intent on destination chain...';
      }
      if (message.includes('Stopped watching')) {
        return 'Stopped watching, but the intent may still be filled by a solver.';
      }
      return message.replace(/relayer/gi, 'solver');

    case EXECUTION_STATUS.FILLED:
      // Add destination chain context
      if (message.includes('Intent filled in block')) {
        const blockMatch = message.match(/block (\d+)/);
        const blockNumber = blockMatch ? blockMatch[1] : 'unknown';
        return `Intent filled by solver in block ${blockNumber} on destination chain`;
      }
      return message;

    default:
      return message.replace(/relayer/gi, 'solver');
  }
}

/**
 * Maps SDK IntentUpdate to our IntentExecutionState
 */
export function mapIntentUpdateToState(
  update: IntentUpdate,
  txHash: Hex,
  originChainId: number,
  destinationChainId: number,
): IntentExecutionState {
  return {
    status: update.status as IntentExecutionStatus,
    message: customizeMessage(update),
    txHash,
    fillTxHash: update.fillTxHash,
    orderId: update.orderId,
    originChainId,
    destinationChainId,
  };
}
