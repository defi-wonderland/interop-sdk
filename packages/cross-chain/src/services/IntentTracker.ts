import { Hex } from "viem";

import {
    FillWatcher,
    IntentStatusInfo,
    IntentUpdate,
    OpenEventWatcher,
    WatchIntentParams,
} from "../internal.js";

/**
 * Unified intent tracker
 * Combines Open event watching with protocol-specific fill watching
 * to provide complete intent lifecycle tracking
 */
export class IntentTracker {
    constructor(
        private readonly openWatcher: OpenEventWatcher,
        private readonly fillWatcher: FillWatcher,
    ) {}

    /**
     * Get the current status of an intent
     * Single point-in-time check
     *
     * @param txHash - Transaction hash where the intent was opened
     * @param originChainId - Origin chain ID
     * @returns Current intent status
     */
    async getIntentStatus(txHash: Hex, originChainId: number): Promise<IntentStatusInfo> {
        const openEvent = await this.openWatcher.getOpenEvent(txHash, originChainId);

        const depositInfo = await this.openWatcher.getAcrossDepositInfo(txHash, originChainId);

        const fillEvent = await this.fillWatcher.watchFill({
            originChainId,
            destinationChainId: Number(depositInfo.destinationChainId),
            depositId: depositInfo.depositId,
            user: openEvent.resolvedOrder.user,
            fillDeadline: openEvent.resolvedOrder.fillDeadline,
        });

        let status: IntentStatusInfo["status"];
        if (fillEvent) {
            status = "filled";
        } else {
            const now = Math.floor(Date.now() / 1000);
            if (now > openEvent.resolvedOrder.fillDeadline) {
                status = "expired";
            } else {
                status = "filling";
            }
        }

        return {
            status,
            orderId: openEvent.orderId,
            openTxHash: txHash,
            user: openEvent.resolvedOrder.user,
            originChainId,
            destinationChainId: Number(depositInfo.destinationChainId),
            fillDeadline: openEvent.resolvedOrder.fillDeadline,
            depositInfo,
            fillEvent: fillEvent || undefined,
        };
    }

    /**
     * Watch an intent with real-time updates
     * Uses async generator to stream status changes
     *
     * @param params - Watch parameters
     * @yields Intent updates as they occur
     *
     * @example
     * ```typescript
     * for await (const update of tracker.watchIntent({ txHash, originChainId, destinationChainId })) {
     *   console.log(update.status, update.message);
     *   if (update.status === 'filled') break;
     * }
     * ```
     */
    async *watchIntent(params: WatchIntentParams): AsyncGenerator<IntentUpdate> {
        const { txHash, originChainId, destinationChainId, timeout = 5 * 60 * 1000 } = params;

        const startTime = Date.now();

        // Step 1: Parse Open event
        yield {
            status: "opened",
            openTxHash: txHash,
            timestamp: Date.now(),
            message: "Parsing intent from transaction...",
        };

        try {
            const openEvent = await this.openWatcher.getOpenEvent(txHash, originChainId);

            yield {
                status: "opened",
                orderId: openEvent.orderId,
                openTxHash: txHash,
                timestamp: Date.now(),
                message: `Intent opened with orderId ${openEvent.orderId.slice(0, 10)}...`,
            };

            // Step 2: Get deposit info
            const depositInfo = await this.openWatcher.getAcrossDepositInfo(txHash, originChainId);

            yield {
                status: "filling",
                orderId: openEvent.orderId,
                openTxHash: txHash,
                timestamp: Date.now(),
                message: "Waiting for relayer to fill intent...",
            };

            // Step 3: Wait for fill with timeout
            try {
                const fillEvent = await this.fillWatcher.waitForFill(
                    {
                        originChainId,
                        destinationChainId,
                        depositId: depositInfo.depositId,
                        user: openEvent.resolvedOrder.user,
                        fillDeadline: openEvent.resolvedOrder.fillDeadline,
                    },
                    timeout - (Date.now() - startTime), // Adjust timeout for time already spent
                );

                yield {
                    status: "filled",
                    orderId: openEvent.orderId,
                    openTxHash: txHash,
                    fillTxHash: fillEvent.fillTxHash,
                    timestamp: Date.now(),
                    message: `Intent filled in block ${fillEvent.blockNumber}`,
                };
            } catch (error) {
                // Timeout or other error
                if (error instanceof Error && error.name === "FillTimeoutError") {
                    // Check if expired
                    const now = Math.floor(Date.now() / 1000);
                    if (now > openEvent.resolvedOrder.fillDeadline) {
                        yield {
                            status: "expired",
                            orderId: openEvent.orderId,
                            openTxHash: txHash,
                            timestamp: Date.now(),
                            message: "Intent expired before fill",
                        };
                    } else {
                        // Timeout but not expired - still might be filled
                        yield {
                            status: "filling",
                            orderId: openEvent.orderId,
                            openTxHash: txHash,
                            timestamp: Date.now(),
                            message: `Timeout reached but intent may still be filled (deadline: ${new Date(openEvent.resolvedOrder.fillDeadline * 1000).toISOString()})`,
                        };
                    }
                } else {
                    // Re-throw unexpected errors
                    throw error;
                }
            }
        } catch (error) {
            // Error parsing events - throw to be handled by caller
            throw error;
        }
    }
}
