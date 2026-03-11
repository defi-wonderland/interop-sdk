import { OrderStatus, OrderTrackerYieldType } from '@wonderland/interop-cross-chain';
import { TIMEOUT_MS } from '../../constants';
import { STEP, type BridgeState, type ChainContext } from '../../types/execution';
import { crossChainExecutor } from '../sdk';
import type { Hex } from 'viem';

export class TrackingError extends Error {
  readonly txHash?: Hex;
  readonly orderId?: Hex;

  constructor(identifier: { txHash?: Hex; orderId?: Hex }, providerId: string) {
    super(`Order tracking failed for provider "${providerId}". The order may still complete.`);
    this.name = 'TrackingError';
    this.txHash = identifier.txHash;
    this.orderId = identifier.orderId;
  }
}

/**
 * Track an order by txHash (Across) or orderId (OIF escrow/3009).
 * The SDK's watchOrder accepts either identifier.
 */
export async function trackOrder(
  providerId: string,
  identifier: { txHash?: Hex; orderId?: Hex },
  chainContext: ChainContext,
  abortSignal: AbortSignal | undefined,
  onStateChange: (state: BridgeState) => void,
): Promise<void> {
  const tracker = crossChainExecutor.prepareTracking(providerId);
  const { txHash, orderId } = identifier;

  const baseParams = {
    originChainId: chainContext.originChainId,
    destinationChainId: chainContext.destinationChainId,
    timeout: TIMEOUT_MS.INTENT_TRACKING_TIMEOUT,
  };

  const watchParams = orderId ? { ...baseParams, orderId, openTxHash: txHash } : { ...baseParams, txHash: txHash! };

  try {
    for await (const item of tracker.watchOrder(watchParams)) {
      if (abortSignal?.aborted) return;

      if (item.type === OrderTrackerYieldType.Update) {
        const update = item.update;

        // Determine step based on SDK status
        if (update.status === OrderStatus.Finalized) {
          onStateChange({ step: STEP.DONE, update, txHash, ...chainContext });
          break;
        } else if (update.status === OrderStatus.Failed || update.status === OrderStatus.Refunded) {
          onStateChange({
            step: STEP.ERROR,
            error: new Error(update.message || 'Order failed'),
            message: update.message || 'Order failed',
            txHash,
            lastUpdate: update,
            ...chainContext,
          });
          break;
        } else {
          // Non-terminal update (Pending, Executing, etc.)
          onStateChange({ step: STEP.TRACKING, update, txHash, ...chainContext });
        }
      } else {
        // Timeout yield
        onStateChange({
          step: STEP.TIMEOUT,
          update: item.payload.lastUpdate,
          timeout: item.payload,
          txHash,
          ...chainContext,
        });
        break;
      }
    }
  } catch (trackingErr) {
    console.warn('Order tracking failed:', trackingErr);
    throw new TrackingError(identifier, providerId);
  }
}
