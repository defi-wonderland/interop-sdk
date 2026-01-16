import { EventEmitter } from "events";
import { Hex } from "viem";

import {
    FillWatcher,
    getChainById,
    OpenedIntentParser,
    OrderFailureReason,
    OrderStatus,
    OrderTrackerEvent,
    OrderTrackerEvents,
    OrderTrackerYield,
    OrderTrackerYieldType,
    OrderTrackingInfo,
    OrderTrackingUpdate,
    PublicClientManager,
    WatchOrderParams,
} from "../internal.js";

const FillResultStatus = {
    Finalized: "finalized",
    DeadlineExceeded: "deadline_exceeded",
    Timeout: "timeout",
} as const;

export class OrderTracker extends EventEmitter {
    override on<K extends keyof OrderTrackerEvents>(
        event: K,
        listener: OrderTrackerEvents[K],
    ): this {
        return super.on(event, listener as (...args: unknown[]) => void);
    }

    override once<K extends keyof OrderTrackerEvents>(
        event: K,
        listener: OrderTrackerEvents[K],
    ): this {
        return super.once(event, listener as (...args: unknown[]) => void);
    }

    override off<K extends keyof OrderTrackerEvents>(
        event: K,
        listener: OrderTrackerEvents[K],
    ): this {
        return super.off(event, listener as (...args: unknown[]) => void);
    }

    override emit<K extends keyof OrderTrackerEvents>(
        event: K,
        ...args: Parameters<OrderTrackerEvents[K]>
    ): boolean {
        return super.emit(event, ...args);
    }

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
                failureReason: OrderFailureReason.OriginTxReverted,
            };
        }

        const openedIntent = await this.openedIntentParser.getOpenedIntent(txHash, originChainId);

        const fillEvent = await this.fillWatcher.getFill({
            originChainId,
            destinationChainId: Number(openedIntent.destinationChainId),
            depositId: openedIntent.depositId,
            user: openedIntent.user,
            fillDeadline: openedIntent.fillDeadline,
        });

        const { status, failureReason } = this.determineOrderStatus(
            fillEvent,
            openedIntent.fillDeadline,
        );

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
            failureReason,
        };
    }

    private determineOrderStatus(
        fillEvent: unknown,
        fillDeadline: number,
    ): { status: OrderStatus; failureReason?: OrderFailureReason } {
        if (fillEvent) {
            return { status: OrderStatus.Finalized };
        }

        const now = Math.floor(Date.now() / 1000);
        if (now > fillDeadline) {
            return {
                status: OrderStatus.Failed,
                failureReason: OrderFailureReason.DeadlineExceeded,
            };
        }

        return { status: OrderStatus.Pending };
    }

    /**
     * Watch an order with real-time updates
     *
     * @param params - Watch parameters
     * @yields Discriminated union: either an order update or a timeout payload
     *
     * @example
     * ```typescript
     * for await (const item of tracker.watchOrder({ txHash, originChainId, destinationChainId, timeout })) {
     *   if (item.type === OrderTrackerYieldType.Update) {
     *     console.log(item.update.status, item.update.message);
     *   } else {
     *     console.log("timeout:", item.payload.message);
     *   }
     * }
     * ```
     */
    async *watchOrder(params: WatchOrderParams): AsyncGenerator<OrderTrackerYield> {
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

        let lastUpdate: OrderTrackingUpdate = this.createUpdate({
            status: OrderStatus.Pending,
            openTxHash: txHash,
            message: "Parsing order from transaction...",
        });
        yield { type: OrderTrackerYieldType.Update, update: lastUpdate };

        const isReverted = await this.checkOriginTxReverted(txHash, originChainId);
        if (isReverted) {
            yield {
                type: OrderTrackerYieldType.Update,
                update: this.createUpdate({
                    status: OrderStatus.Failed,
                    openTxHash: txHash,
                    message: "Origin transaction reverted",
                    failureReason: OrderFailureReason.OriginTxReverted,
                }),
            };
            return;
        }

        const openedIntent = await this.openedIntentParser.getOpenedIntent(txHash, originChainId);

        lastUpdate = this.createUpdate({
            status: OrderStatus.Pending,
            orderId: openedIntent.orderId,
            openTxHash: txHash,
            message: `Order parsed with orderId ${openedIntent.orderId.slice(0, 10)}...`,
        });
        yield { type: OrderTrackerYieldType.Update, update: lastUpdate };

        const nowSeconds = Math.floor(Date.now() / 1000);
        const fillDeadline = openedIntent.fillDeadline;
        const isDeadlineExceeded = nowSeconds > fillDeadline + OrderTracker.GRACE_PERIOD_SECONDS;

        if (isDeadlineExceeded) {
            yield {
                type: OrderTrackerYieldType.Update,
                update: this.createUpdate({
                    status: OrderStatus.Failed,
                    orderId: openedIntent.orderId,
                    openTxHash: txHash,
                    message: "Deadline exceeded before watching started",
                    failureReason: OrderFailureReason.DeadlineExceeded,
                }),
            };
            return;
        }

        const elapsedTime = Date.now() - startTime;
        const remainingTimeout = Math.max(0, timeout - elapsedTime);

        if (remainingTimeout === 0) {
            yield this.createTimeoutYield(
                lastUpdate,
                fillDeadline,
                "Timeout expired during order setup",
            );
            return;
        }

        lastUpdate = this.createUpdate({
            status: OrderStatus.Pending,
            orderId: openedIntent.orderId,
            openTxHash: txHash,
            message: "Waiting for solver to fill order...",
        });
        yield { type: OrderTrackerYieldType.Update, update: lastUpdate };

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

        yield this.createFillResultYield(
            fillResult,
            openedIntent.orderId,
            txHash,
            lastUpdate,
            fillDeadline,
        );
    }

    private createFillResultYield(
        fillResult: Awaited<ReturnType<typeof this.waitForFillWithTimeout>>,
        orderId: Hex,
        txHash: Hex,
        lastUpdate: OrderTrackingUpdate,
        fillDeadline: number,
    ): OrderTrackerYield {
        if (fillResult.status === FillResultStatus.Finalized) {
            return {
                type: OrderTrackerYieldType.Update,
                update: this.createUpdate({
                    status: OrderStatus.Finalized,
                    orderId,
                    openTxHash: txHash,
                    fillTxHash: fillResult.fillTxHash,
                    message: `Order completed in block ${fillResult.blockNumber}`,
                }),
            };
        }

        if (fillResult.status === FillResultStatus.DeadlineExceeded) {
            return {
                type: OrderTrackerYieldType.Update,
                update: this.createUpdate({
                    status: OrderStatus.Failed,
                    orderId,
                    openTxHash: txHash,
                    message: "Deadline exceeded before fill",
                    failureReason: OrderFailureReason.DeadlineExceeded,
                }),
            };
        }

        return this.createTimeoutYield(lastUpdate, fillDeadline, "Stopped watching after timeout");
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
     * tracker.on(OrderStatus.Pending, (update) => console.log('Pending...'));
     * tracker.on(OrderStatus.Finalized, (update) => console.log('Finalized!', update.fillTxHash));
     * tracker.on(OrderStatus.Failed, (update) => console.log('Failed:', update.failureReason));
     * tracker.on('timeout', (payload) => console.log('Timeout:', payload.message));
     * tracker.on('error', (err) => console.error(err));
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
            await this.processWatchUpdates(params);
            return await this.getOrderStatus(params.txHash, params.originChainId);
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.emit(OrderTrackerEvent.Error, err);
            throw error;
        }
    }

    private async processWatchUpdates(params: WatchOrderParams): Promise<void> {
        const terminalStatuses = new Set([
            OrderStatus.Finalized,
            OrderStatus.Failed,
            OrderStatus.Refunded,
        ]);

        for await (const item of this.watchOrder(params)) {
            if (item.type === OrderTrackerYieldType.Timeout) {
                this.emit(OrderTrackerEvent.Timeout, item.payload);
                return;
            }

            this.emit(item.update.status, item.update);

            if (terminalStatuses.has(item.update.status)) {
                return;
            }
        }
    }

    private createUpdate(params: Omit<OrderTrackingUpdate, "timestamp">): OrderTrackingUpdate {
        return {
            ...params,
            timestamp: Math.floor(Date.now() / 1000),
        };
    }

    private createTimeoutYield(
        lastUpdate: OrderTrackingUpdate,
        fillDeadline: number,
        reason: string,
    ): OrderTrackerYield {
        const deadlineDate = new Date(fillDeadline * 1000).toISOString();
        return {
            type: OrderTrackerYieldType.Timeout,
            payload: {
                lastUpdate,
                timestamp: Math.floor(Date.now() / 1000),
                message: `${reason}. Order may still finalize before deadline at ${deadlineDate}`,
            },
        };
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
        | {
              status: typeof FillResultStatus.Finalized;
              fillTxHash: Hex;
              blockNumber: bigint;
          }
        | { status: typeof FillResultStatus.DeadlineExceeded }
        | { status: typeof FillResultStatus.Timeout }
    > {
        try {
            const fillEvent = await this.fillWatcher.waitForFill(fillParams, timeout);
            return {
                status: FillResultStatus.Finalized,
                fillTxHash: fillEvent.fillTxHash,
                blockNumber: fillEvent.blockNumber,
            };
        } catch (error) {
            if (error instanceof Error && error.name === "FillTimeoutError") {
                const nowSeconds = Math.floor(Date.now() / 1000);
                const isDeadlineExceeded = nowSeconds > fillParams.fillDeadline;

                return isDeadlineExceeded
                    ? { status: FillResultStatus.DeadlineExceeded }
                    : { status: FillResultStatus.Timeout };
            }
            throw error;
        }
    }
}
