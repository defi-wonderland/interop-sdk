import { EventEmitter } from "events";
import { Hex } from "viem";

import {
    DepositInfoParser,
    FillWatcher,
    IntentStatusInfo,
    IntentUpdate,
    OpenEventParser,
    WatchIntentParams,
} from "../internal.js";

/**
 * Event map for IntentTracker events
 */
export interface IntentTrackerEvents {
    opening: (update: IntentUpdate) => void;
    opened: (update: IntentUpdate) => void;
    filling: (update: IntentUpdate) => void;
    filled: (update: IntentUpdate) => void;
    expired: (update: IntentUpdate) => void;
    error: (error: Error) => void;
}

/**
 * Intent tracker with event-based updates
 */
export class IntentTracker extends EventEmitter {
    /**
     * Grace period in seconds after fillDeadline to still accept fills
     */
    static readonly GRACE_PERIOD_SECONDS = 60;

    /**
     * Default timeout in milliseconds for tracking operations
     */
    static readonly DEFAULT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

    constructor(
        private readonly openEventParser: OpenEventParser,
        private readonly depositInfoParser: DepositInfoParser,
        private readonly fillWatcher: FillWatcher,
    ) {
        super();
    }

    /**
     * Get the current status of an intent
     *
     * @param txHash - Transaction hash where the intent was opened
     * @param originChainId - Origin chain ID
     * @returns Current intent status
     */
    async getIntentStatus(txHash: Hex, originChainId: number): Promise<IntentStatusInfo> {
        const openEvent = await this.openEventParser.getOpenEvent(txHash, originChainId);

        const depositInfo = await this.depositInfoParser.getDepositInfo(txHash, originChainId);

        const fillEvent = await this.fillWatcher.getFill({
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
     *
     * @param params - Watch parameters
     * @yields Intent updates as they occur
     *
     * @example
     * ```typescript
     * for await (const update of tracker.watchIntent({ txHash, originChainId, destinationChainId, timeout })) {
     *   console.log(update.status, update.message);
     *   if (update.status === 'filled') break;
     * }
     * ```
     */
    async *watchIntent(params: WatchIntentParams): AsyncGenerator<IntentUpdate> {
        const {
            txHash,
            originChainId,
            destinationChainId,
            timeout = IntentTracker.DEFAULT_TIMEOUT_MS,
        } = params;

        if (timeout <= 0) {
            throw new Error(`Timeout must be positive, got ${timeout}ms`);
        }

        const startTime = Date.now();

        yield {
            status: "opening",
            openTxHash: txHash,
            timestamp: Math.floor(Date.now() / 1000),
            message: "Parsing intent from transaction...",
        };

        const openEvent = await this.openEventParser.getOpenEvent(txHash, originChainId);

        yield {
            status: "opened",
            orderId: openEvent.orderId,
            openTxHash: txHash,
            timestamp: Math.floor(Date.now() / 1000),
            message: `Intent opened with orderId ${openEvent.orderId.slice(0, 10)}...`,
        };

        const depositInfo = await this.depositInfoParser.getDepositInfo(txHash, originChainId);

        const nowSeconds = Math.floor(Date.now() / 1000);
        const fillDeadline = openEvent.resolvedOrder.fillDeadline;

        if (nowSeconds > fillDeadline + IntentTracker.GRACE_PERIOD_SECONDS) {
            yield {
                status: "expired",
                orderId: openEvent.orderId,
                openTxHash: txHash,
                timestamp: Math.floor(Date.now() / 1000),
                message: "Intent expired before watching started",
            };
            return;
        }

        const elapsedTime = Date.now() - startTime;
        const remainingTimeout = Math.max(0, timeout - elapsedTime);

        if (remainingTimeout === 0) {
            const deadlineDate = new Date(fillDeadline * 1000).toISOString();
            yield {
                status: "filling",
                orderId: openEvent.orderId,
                openTxHash: txHash,
                timestamp: Math.floor(Date.now() / 1000),
                message: `Timeout expired during intent setup. Intent may still be filled before deadline at ${deadlineDate}`,
            };
            return;
        }

        yield {
            status: "filling",
            orderId: openEvent.orderId,
            openTxHash: txHash,
            timestamp: Math.floor(Date.now() / 1000),
            message: "Waiting for relayer to fill intent...",
        };

        const fillResult = await this.waitForFillWithTimeout(
            {
                originChainId,
                destinationChainId,
                depositId: depositInfo.depositId,
                user: openEvent.resolvedOrder.user,
                fillDeadline: openEvent.resolvedOrder.fillDeadline,
            },
            remainingTimeout,
        );

        if (fillResult.status === "filled") {
            yield {
                status: "filled",
                orderId: openEvent.orderId,
                openTxHash: txHash,
                fillTxHash: fillResult.fillTxHash,
                timestamp: Math.floor(Date.now() / 1000),
                message: `Intent filled in block ${fillResult.blockNumber}`,
            };
        } else if (fillResult.status === "expired") {
            yield {
                status: "expired",
                orderId: openEvent.orderId,
                openTxHash: txHash,
                timestamp: Math.floor(Date.now() / 1000),
                message: "Intent expired before fill",
            };
        } else {
            const deadlineDate = new Date(fillDeadline * 1000).toISOString();
            yield {
                status: "filling",
                orderId: openEvent.orderId,
                openTxHash: txHash,
                timestamp: Math.floor(Date.now() / 1000),
                message: `Stopped watching after timeout, but intent may still be filled before deadline at ${deadlineDate}`,
            };
        }
    }

    /**
     * Start tracking an intent with event-based updates
     *
     * @param params - Watch parameters including optional timeout (defaults to 5 minutes)
     * @param params.txHash - Transaction hash where the intent was opened
     * @param params.originChainId - Origin chain ID
     * @param params.destinationChainId - Destination chain ID
     * @param params.timeout - Optional timeout in ms (default: 300000ms / 5 min)
     * @returns Promise that resolves with final intent status
     *
     * @example
     * ```typescript
     * const tracker = new IntentTracker(...);
     *
     * tracker.on('opening', (update) => console.log('Opening...'));
     * tracker.on('filled', (update) => console.log('Filled!', update.fillTxHash));
     * tracker.on('expired', (update) => console.log('Expired'));
     *
     * const finalStatus = await tracker.startTracking({
     *   txHash,
     *   originChainId,
     *   destinationChainId,
     *   timeout: 10 * 60 * 1000 // 10 minutes
     * });
     * ```
     */
    async startTracking(params: WatchIntentParams): Promise<IntentStatusInfo> {
        try {
            for await (const update of this.watchIntent(params)) {
                this.emit(update.status, update);

                if (update.status === "filled" || update.status === "expired") {
                    break;
                }
            }

            const finalStatus = await this.getIntentStatus(params.txHash, params.originChainId);
            return finalStatus;
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.emit("error", err);
            throw error;
        }
    }

    private async waitForFillWithTimeout(
        fillParams: {
            originChainId: number;
            destinationChainId: number;
            depositId: bigint;
            user: Hex;
            fillDeadline: number;
        },
        timeout: number,
    ): Promise<
        | { status: "filled"; fillTxHash: Hex; blockNumber: bigint }
        | { status: "expired" }
        | { status: "timeout" }
    > {
        try {
            const fillEvent = await this.fillWatcher.waitForFill(fillParams, timeout);
            return {
                status: "filled",
                fillTxHash: fillEvent.fillTxHash,
                blockNumber: fillEvent.blockNumber,
            };
        } catch (error) {
            if (error instanceof Error && error.name === "FillTimeoutError") {
                const nowSeconds = Math.floor(Date.now() / 1000);
                const isExpired = nowSeconds > fillParams.fillDeadline;

                return isExpired ? { status: "expired" } : { status: "timeout" };
            }
            throw error;
        }
    }
}
