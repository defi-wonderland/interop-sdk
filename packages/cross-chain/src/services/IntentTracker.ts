import { Hex } from "viem";

import {
    DepositInfoParser,
    FillWatcher,
    IntentStatusInfo,
    IntentUpdate,
    OpenEventWatcher,
    WatchIntentParams,
} from "../internal.js";

/**
 * Unified intent tracker
 * Protocol-agnostic orchestrator that combines:
 * - Open event watching (EIP-7683 standard)
 * - Protocol-specific deposit info parsing
 * - Protocol-specific fill watching
 */
export class IntentTracker {
    constructor(
        private readonly openWatcher: OpenEventWatcher,
        private readonly depositInfoParser: DepositInfoParser,
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

        if (timeout <= 0) {
            throw new Error(`Timeout must be positive, got ${timeout}ms`);
        }

        const startTime = Date.now();

        yield {
            status: "opening",
            openTxHash: txHash,
            timestamp: Date.now(),
            message: "Parsing intent from transaction...",
        };

        const openEvent = await this.openWatcher.getOpenEvent(txHash, originChainId);

        yield {
            status: "opened",
            orderId: openEvent.orderId,
            openTxHash: txHash,
            timestamp: Date.now(),
            message: `Intent opened with orderId ${openEvent.orderId.slice(0, 10)}...`,
        };

        const depositInfo = await this.depositInfoParser.getDepositInfo(txHash, originChainId);

        const nowSeconds = Math.floor(Date.now() / 1000);
        const fillDeadline = openEvent.resolvedOrder.fillDeadline;
        const GRACE_PERIOD_SECONDS = 60;

        if (nowSeconds > fillDeadline + GRACE_PERIOD_SECONDS) {
            yield {
                status: "expired",
                orderId: openEvent.orderId,
                openTxHash: txHash,
                timestamp: Date.now(),
                message: "Intent expired before watching started",
            };
            return;
        }

        const elapsedTime = Date.now() - startTime;
        const remainingTimeout = Math.max(0, timeout - elapsedTime);

        // If no time remaining, exit early with timeout message
        if (remainingTimeout === 0) {
            const deadlineDate = new Date(fillDeadline * 1000).toISOString();
            yield {
                status: "filling",
                orderId: openEvent.orderId,
                openTxHash: txHash,
                timestamp: Date.now(),
                message: `Timeout expired during intent setup. Intent may still be filled before deadline at ${deadlineDate}`,
            };
            return;
        }

        yield {
            status: "filling",
            orderId: openEvent.orderId,
            openTxHash: txHash,
            timestamp: Date.now(),
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
                timestamp: Date.now(),
                message: `Intent filled in block ${fillResult.blockNumber}`,
            };
        } else if (fillResult.status === "expired") {
            yield {
                status: "expired",
                orderId: openEvent.orderId,
                openTxHash: txHash,
                timestamp: Date.now(),
                message: "Intent expired before fill",
            };
        } else {
            const deadlineDate = new Date(fillDeadline * 1000).toISOString();
            yield {
                status: "filling",
                orderId: openEvent.orderId,
                openTxHash: txHash,
                timestamp: Date.now(),
                message: `Stopped watching after timeout, but intent may still be filled before deadline at ${deadlineDate}`,
            };
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
