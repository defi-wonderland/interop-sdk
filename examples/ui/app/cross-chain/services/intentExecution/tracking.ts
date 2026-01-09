import { TIMEOUT_MS } from '../../constants';
import { EXECUTION_STATUS, type IntentExecutionState } from '../../types/execution';
import { crossChainExecutor } from '../sdk';
import { mapIntentUpdateToState } from './stateMapper';
import type { Hex } from 'viem';

export class TrackingError extends Error {
  readonly txHash: Hex;

  constructor(txHash: Hex, providerId: string) {
    super(`Intent tracking failed for provider "${providerId}". The transaction may still complete.`);
    this.name = 'TrackingError';
    this.txHash = txHash;
  }
}

export async function trackIntent(
  providerId: string,
  txHash: Hex,
  originChainId: number,
  destinationChainId: number,
  abortSignal: AbortSignal | undefined,
  onStateChange: (state: IntentExecutionState) => void,
): Promise<void> {
  onStateChange({ status: EXECUTION_STATUS.OPENING, message: 'Transaction confirmed! Parsing intent...', txHash });

  const tracker = crossChainExecutor.prepareTracking(providerId);

  try {
    for await (const update of tracker.watchIntent({
      txHash,
      originChainId,
      destinationChainId,
      timeout: TIMEOUT_MS.INTENT_TRACKING_TIMEOUT,
    })) {
      if (abortSignal?.aborted) return;

      onStateChange(mapIntentUpdateToState(update, txHash, originChainId, destinationChainId));

      if (update.status === EXECUTION_STATUS.FILLED || update.status === EXECUTION_STATUS.EXPIRED) {
        break;
      }
    }
  } catch (trackingErr) {
    console.warn('Intent tracking failed:', trackingErr);
    throw new TrackingError(txHash, providerId);
  }
}
