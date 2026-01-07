import { EventEmitter } from "events";
import { Hex } from "viem";

import {
    FillWatcher,
    getChainById,
    OpenedIntentParser,
    OrderStatus,
    OrderStatusOrExpired,
    OrderTrackingInfo,
    OrderTrackingUpdate,
    PublicClientManager,
    WatchOrderParams,
} from "../internal.js";

export class OrderTracker extends EventEmitter {
    static readonly GRACE_PERIOD_SECONDS = 60;
    static readonly DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

    constructor(
        private readonly openedIntentParser: OpenedIntentParser,
        private readonly fillWatcher: FillWatcher,
        private readonly clientManager?: PublicClientManager,
    ) {
        super();
    }

    async getOrderStatus(txHash: Hex, originChainId: number): Promise<OrderTrackingInfo> {
        if (this.clientManager) {
            const isReverted = await this.checkOriginTxReverted(txHash, originChainId);
            if (isReverted) {
                return {
                    status: OrderStatus.Failed,
                    orderId: "0x" as Hex,
                    openTxHash: txHash,
                    user: "0x" as Hex,
                    originChainId,
                    destinationChainId: 0,
                    fillDeadline: 0,
                    depositId: 0n,
                    inputAmount: 0n,
                    outputAmount: 0n,
                };
            }
        }

        const openedIntent = await this.openedIntentParser.getOpenedIntent(txHash, originChainId);

        const fillEvent = await this.fillWatcher.getFill({
            originChainId,
            destinationChainId: Number(openedIntent.destinationChainId),
            depositId: openedIntent.depositId,
            user: openedIntent.user,
            fillDeadline: openedIntent.fillDeadline,
        });

        let status: OrderStatusOrExpired;
        if (fillEvent) {
            status = OrderStatus.Finalized;
        } else {
            const now = Math.floor(Date.now() / 1000);
            if (now > openedIntent.fillDeadline) {
                status = "expired";
            } else {
                status = OrderStatus.Pending;
            }
        }

        return {
            status,
            orderId: openedIntent.orderId,
            openTxHash: txHash,
            user: openedIntent.user,
            originChainId,
            destinationChainId: Number(openedIntent.destinationChainId),
            fillDeadline: openedIntent.fillDeadline,
            depositId: openedIntent.depositId,
            inputAmount: openedIntent.inputAmount,
            outputAmount: openedIntent.outputAmount,
            fillEvent: fillEvent || undefined,
        };
    }

    /**
     * Watch an order with real-time updates
     *
     * @param params - Watch parameters
     * @yields Order updates as they occur
     *
     * @example
     * ```typescript
     * for await (const update of tracker.watchOrder({ txHash, originChainId, destinationChainId, timeout })) {
     *   console.log(update.status, update.message);
     *   if (update.status === 'completed') break;
     * }
     * ```
     */
    async *watchOrder(params: WatchOrderParams): AsyncGenerator<OrderTrackingUpdate> {
        const {
            txHash,
            originChainId,
            destinationChainId,
            timeout = OrderTracker.DEFAULT_TIMEOUT_MS,
        } = params;

        if (timeout <= 0) {
            throw new Error(`Timeout must be positive, got ${timeout}ms`);
        }

        const startTime = Date.now();

        yield {
            status: OrderStatus.Pending,
            openTxHash: txHash,
            timestamp: Math.floor(Date.now() / 1000),
            message: "Parsing order from transaction...",
        };

        if (this.clientManager) {
            const isReverted = await this.checkOriginTxReverted(txHash, originChainId);
            if (isReverted) {
                yield {
                    status: OrderStatus.Failed,
                    openTxHash: txHash,
                    timestamp: Math.floor(Date.now() / 1000),
                    message: "Origin transaction reverted",
                };
                return;
            }
        }

        const openedIntent = await this.openedIntentParser.getOpenedIntent(txHash, originChainId);

        yield {
            status: OrderStatus.Pending,
            orderId: openedIntent.orderId,
            openTxHash: txHash,
            timestamp: Math.floor(Date.now() / 1000),
            message: `Order parsed with orderId ${openedIntent.orderId.slice(0, 10)}...`,
        };

        const nowSeconds = Math.floor(Date.now() / 1000);
        const fillDeadline = openedIntent.fillDeadline;

        if (nowSeconds > fillDeadline + OrderTracker.GRACE_PERIOD_SECONDS) {
            yield {
                status: "expired",
                orderId: openedIntent.orderId,
                openTxHash: txHash,
                timestamp: Math.floor(Date.now() / 1000),
                message: "Order expired before watching started",
            };
            return;
        }

        const elapsedTime = Date.now() - startTime;
        const remainingTimeout = Math.max(0, timeout - elapsedTime);

        if (remainingTimeout === 0) {
            const deadlineDate = new Date(fillDeadline * 1000).toISOString();
            yield {
                status: OrderStatus.Pending,
                orderId: openedIntent.orderId,
                openTxHash: txHash,
                timestamp: Math.floor(Date.now() / 1000),
                message: `Timeout expired during order setup. Order may still be filled before deadline at ${deadlineDate}`,
            };
            return;
        }

        yield {
            status: OrderStatus.Pending,
            orderId: openedIntent.orderId,
            openTxHash: txHash,
            timestamp: Math.floor(Date.now() / 1000),
            message: "Waiting for solver to fill order...",
        };

        const fillResult = await this.waitForFillWithTimeout(
            {
                originChainId,
                destinationChainId,
                depositId: openedIntent.depositId,
                user: openedIntent.user,
                fillDeadline: openedIntent.fillDeadline,
            },
            remainingTimeout,
        );

        if (fillResult.status === "finalized") {
            yield {
                status: OrderStatus.Finalized,
                orderId: openedIntent.orderId,
                openTxHash: txHash,
                fillTxHash: fillResult.fillTxHash,
                timestamp: Math.floor(Date.now() / 1000),
                message: `Order completed in block ${fillResult.blockNumber}`,
            };
        } else if (fillResult.status === "expired") {
            yield {
                status: "expired",
                orderId: openedIntent.orderId,
                openTxHash: txHash,
                timestamp: Math.floor(Date.now() / 1000),
                message: "Order expired before fill",
            };
        } else {
            const deadlineDate = new Date(fillDeadline * 1000).toISOString();
            yield {
                status: OrderStatus.Pending,
                orderId: openedIntent.orderId,
                openTxHash: txHash,
                timestamp: Math.floor(Date.now() / 1000),
                message: `Stopped watching after timeout, but order may still be filled before deadline at ${deadlineDate}`,
            };
        }
    }

    /**
     * Start tracking an order with event-based updates
     *
     * @param params - Watch parameters including optional timeout (defaults to 5 minutes)
     * @returns Promise that resolves with final order status
     *
     * @example
     * ```typescript
     * const tracker = new OrderTracker(...);
     *
     * tracker.on('pending', (update) => console.log('Pending...'));
     * tracker.on('completed', (update) => console.log('Completed!', update.fillTxHash));
     * tracker.on('expired', (update) => console.log('Expired'));
     * tracker.on('failed', (update) => console.log('Failed'));
     *
     * const finalStatus = await tracker.startTracking({
     *   txHash,
     *   originChainId,
     *   destinationChainId,
     *   timeout: 10 * 60 * 1000
     * });
     * ```
     */
    async startTracking(params: WatchOrderParams): Promise<OrderTrackingInfo> {
        try {
            for await (const update of this.watchOrder(params)) {
                this.emit(update.status, update);

                if (
                    update.status === OrderStatus.Finalized ||
                    update.status === "expired" ||
                    update.status === OrderStatus.Failed ||
                    update.status === OrderStatus.Refunded
                ) {
                    break;
                }
            }

            const finalStatus = await this.getOrderStatus(params.txHash, params.originChainId);
            return finalStatus;
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.emit("error", err);
            throw error;
        }
    }

    private async checkOriginTxReverted(txHash: Hex, chainId: number): Promise<boolean> {
        if (!this.clientManager) {
            return false;
        }

        try {
            const chain = getChainById(chainId);
            const client = this.clientManager.getClient(chain);
            const receipt = await client.getTransactionReceipt({ hash: txHash });
            return receipt.status === "reverted";
        } catch {
            return false;
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
        | { status: "finalized"; fillTxHash: Hex; blockNumber: bigint }
        | { status: "expired" }
        | { status: "timeout" }
    > {
        try {
            const fillEvent = await this.fillWatcher.waitForFill(fillParams, timeout);
            return {
                status: "finalized",
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
