import { OrderStatusOrExpired } from '@wonderland/interop-cross-chain';
import { TIMEOUT_MS } from '../../constants';
import { EXECUTION_STATUS, type OrderExecutionState } from '../../types/execution';
import { crossChainExecutor } from '../sdk';
import { mapOrderUpdateToState } from './stateMapper';
import type { Hex } from 'viem';

export class TrackingError extends Error {
  readonly txHash: Hex;

  constructor(txHash: Hex, providerId: string) {
    super(`Order tracking failed for provider "${providerId}". The transaction may still complete.`);
    this.name = 'TrackingError';
    this.txHash = txHash;
  }
}

export async function trackOrder(
  providerId: string,
  txHash: Hex,
  originChainId: number,
  destinationChainId: number,
  abortSignal: AbortSignal | undefined,
  onStateChange: (state: OrderExecutionState) => void,
): Promise<void> {
  onStateChange({ status: EXECUTION_STATUS.PENDING, message: 'Transaction confirmed! Parsing order...', txHash });

  const tracker = crossChainExecutor.prepareTracking(providerId);

  try {
    for await (const update of tracker.watchOrder({
      txHash,
      originChainId,
      destinationChainId,
      timeout: TIMEOUT_MS.INTENT_TRACKING_TIMEOUT,
    })) {
      if (abortSignal?.aborted) return;

      onStateChange(mapOrderUpdateToState(update, txHash, originChainId, destinationChainId));

      const isTerminal =
        update.status === OrderStatusOrExpired.Finalized ||
        update.status === OrderStatusOrExpired.Failed ||
        update.status === OrderStatusOrExpired.Expired;
      if (isTerminal) {
        break;
      }
    }
  } catch (trackingErr) {
    console.warn('Order tracking failed:', trackingErr);
    throw new TrackingError(txHash, providerId);
  }
}
