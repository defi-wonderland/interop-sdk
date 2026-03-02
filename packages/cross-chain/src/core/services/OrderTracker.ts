import { EventEmitter } from "events";
import { Address, Hex } from "viem";

import type { FillWatcher } from "../interfaces/fillWatcher.interface.js";
import type { OpenedIntentParser } from "../interfaces/openedIntentParser.interface.js";
import type { OrderTrackerEvents } from "../interfaces/orderTracker.interface.js";
import type {
    OpenedIntent,
    OrderTrackerYield,
    OrderTrackingInfo,
    OrderTrackingUpdate,
    WatchOrderByOrderId,
    WatchOrderByTxHash,
    WatchOrderParams,
} from "../types/orderTracking.js";
import { OpenedIntentNotFoundError } from "../errors/OpenedIntentNotFound.exception.js";
import { OrderTrackerEvent } from "../interfaces/orderTracker.interface.js";
import { OrderFailureReason, OrderStatus, OrderTrackerYieldType } from "../types/orderTracking.js";
import { getChainById } from "../utils/chainHelpers.js";
import { PublicClientManager } from "../utils/publicClientManager.js";

const FillResultStatus = {
    Finalized: "finalized",
    Failed: "failed",
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
                orderId:
                    "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex,
                openTxHash: txHash,
                user: "0x0000000000000000000000000000000000000000" as Address,
                originChainId,
                openDeadline: 0,
                fillDeadline: 0,
                maxSpent: [],
                minReceived: [],
                fillInstructions: [],
                failureReason: OrderFailureReason.OriginTxReverted,
            };
        }

        const openedIntent = await this.openedIntentParser.getOpenedIntent(txHash, originChainId);

        const destinationChainId = openedIntent.fillInstructions[0]?.destinationChainId || 0;

        const {
            fillEvent,
            status,
            failureReason: watcherFailureReason,
        } = await this.fillWatcher.getFill({
            orderId: openedIntent.orderId,
            openTxHash: txHash,
            originChainId,
            destinationChainId,
            user: openedIntent.user,
            fillDeadline: openedIntent.fillDeadline,
        });

        let failureReason: OrderFailureReason | undefined = watcherFailureReason;
        if (status === OrderStatus.Failed && !failureReason) {
            const now = Math.floor(Date.now() / 1000);
            failureReason =
                now > openedIntent.fillDeadline
                    ? OrderFailureReason.DeadlineExceeded
                    : OrderFailureReason.Unknown;
        }

        return {
            status,
            orderId: openedIntent.orderId,
            openTxHash: txHash,
            user: openedIntent.user,
            originChainId: openedIntent.originChainId,
            openDeadline: openedIntent.openDeadline,
            fillDeadline: openedIntent.fillDeadline,
            maxSpent: openedIntent.maxSpent,
            minReceived: openedIntent.minReceived,
            fillInstructions: openedIntent.fillInstructions,
            fillEvent: fillEvent || undefined,
            failureReason,
        };
    }

    /**
     * Watch an order with real-time updates.
     * Supports both user-open orders (by txHash) and escrow orders (by orderId).
     *
     * @param params - Watch parameters (pass txHash OR orderId)
     * @yields Discriminated union: either an order update or a timeout payload
     *
     * @example User-open order (by txHash)
     * ```typescript
     * for await (const item of tracker.watchOrder({ txHash, originChainId, destinationChainId })) {
     *   if (item.type === OrderTrackerYieldType.Update) {
     *     console.log(item.update.status, item.update.message);
     *   } else {
     *     console.log("timeout:", item.payload.message);
     *   }
     * }
     * ```
     *
     * @example Escrow order (by orderId)
     * ```typescript
     * for await (const item of tracker.watchOrder({ orderId, originChainId, destinationChainId })) {
     *   if (item.type === OrderTrackerYieldType.Update) {
     *     console.log(item.update.status, item.update.message);
     *   } else {
     *     console.log("timeout:", item.payload.message);
     *   }
     * }
     * ```
     */
    async *watchOrder(params: WatchOrderParams): AsyncGenerator<OrderTrackerYield> {
        const timeout = params.timeout ?? OrderTracker.DEFAULT_TIMEOUT_MS;

        if (timeout <= 0) {
            throw new Error(`Timeout must be positive, got ${timeout}ms`);
        }

        if ("txHash" in params && params.txHash) {
            yield* this.watchOrderByTxHash({ ...params, timeout });
        } else {
            yield* this.watchOrderByOrderId({ ...(params as WatchOrderByOrderId), timeout });
        }
    }

    /** Watch user-open order by parsing Open event from txHash */
    private async *watchOrderByTxHash(
        params: WatchOrderByTxHash & { timeout: number },
    ): AsyncGenerator<OrderTrackerYield> {
        const { txHash, originChainId, timeout } = params;
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

        let openedIntent: OpenedIntent;
        try {
            openedIntent = await this.openedIntentParser.getOpenedIntent(txHash, originChainId);
        } catch (error) {
            if (error instanceof OpenedIntentNotFoundError) {
                // Transaction succeeded (not reverted) but the expected deposit event
                // was not found — likely an alternative bridge route (e.g. CCTP).
                yield {
                    type: OrderTrackerYieldType.Update,
                    update: this.createUpdate({
                        status: OrderStatus.Finalized,
                        openTxHash: txHash,
                        message:
                            "Bridge transaction confirmed. Funds may take a few minutes to arrive.",
                    }),
                };
                return;
            }
            throw error;
        }

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

        const destChainId = openedIntent.fillInstructions[0]?.destinationChainId;
        if (!destChainId) {
            throw new Error("Order has no destination chain in fillInstructions");
        }

        const fillResult = await this.waitForFillWithTimeout(
            {
                orderId: openedIntent.orderId,
                openTxHash: txHash,
                originChainId,
                destinationChainId: destChainId,
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

    /** Watch escrow order by polling API directly with orderId */
    private async *watchOrderByOrderId(
        params: WatchOrderByOrderId & { timeout: number },
    ): AsyncGenerator<OrderTrackerYield> {
        const { orderId, originChainId, destinationChainId, timeout } = params;
        const startTime = Date.now();

        let lastUpdate: OrderTrackingUpdate = this.createUpdate({
            status: OrderStatus.Pending,
            orderId,
            message: "Tracking escrow order...",
        });
        yield { type: OrderTrackerYieldType.Update, update: lastUpdate };

        lastUpdate = this.createUpdate({
            status: OrderStatus.Pending,
            orderId,
            message: "Waiting for solver to fill order...",
        });
        yield { type: OrderTrackerYieldType.Update, update: lastUpdate };

        yield* this.pollForFillWithYields(
            { orderId, originChainId, destinationChainId },
            timeout - (Date.now() - startTime),
        );
    }

    /**
     * Poll fillWatcher.getFill() in a generator loop, yielding intermediate updates.
     * Used by escrow (orderId) path so the UI can show fillTxHash before finalization.
     * The txHash (Across) path uses waitForFillWithTimeout instead.
     */
    private async *pollForFillWithYields(
        fillParams: { orderId: Hex; originChainId: number; destinationChainId: number },
        timeout: number,
    ): AsyncGenerator<OrderTrackerYield> {
        const terminalFailures = new Set([OrderStatus.Failed, OrderStatus.Refunded]);
        const pollingInterval = 5000;
        const startTime = Date.now();
        let lastUpdate: OrderTrackingUpdate | undefined;

        while (Date.now() - startTime < timeout) {
            const { fillEvent, status, failureReason, fillTxHash } =
                await this.fillWatcher.getFill(fillParams);

            if (fillEvent) {
                yield {
                    type: OrderTrackerYieldType.Update,
                    update: this.createUpdate({
                        status: OrderStatus.Finalized,
                        orderId: fillParams.orderId,
                        fillTxHash: fillEvent.fillTxHash,
                        message: "Order completed",
                    }),
                };
                return;
            }

            if (terminalFailures.has(status)) {
                yield {
                    type: OrderTrackerYieldType.Update,
                    update: this.createUpdate({
                        status: OrderStatus.Failed,
                        orderId: fillParams.orderId,
                        message: "Order failed",
                        failureReason: failureReason ?? OrderFailureReason.Unknown,
                    }),
                };
                return;
            }

            // Finalized but no fillTxHash — stop polling
            if (status === OrderStatus.Finalized) {
                yield {
                    type: OrderTrackerYieldType.Update,
                    update: this.createUpdate({
                        status: OrderStatus.Failed,
                        orderId: fillParams.orderId,
                        message: "Order finalized but fill transaction hash unavailable",
                        failureReason: OrderFailureReason.Unknown,
                    }),
                };
                return;
            }

            // Yield intermediate update with fillTxHash when available (e.g. executing status)
            if (fillTxHash) {
                lastUpdate = this.createUpdate({
                    status,
                    orderId: fillParams.orderId,
                    fillTxHash: fillTxHash as Hex,
                    message: `Order ${status}, fill tx detected`,
                });
                yield { type: OrderTrackerYieldType.Update, update: lastUpdate };
            }

            await new Promise((resolve) => setTimeout(resolve, pollingInterval));
        }

        yield this.createTimeoutYield(
            lastUpdate ??
                this.createUpdate({
                    status: OrderStatus.Pending,
                    orderId: fillParams.orderId,
                    message: "Waiting for solver to fill order...",
                }),
            0,
            "Stopped watching after timeout",
        );
    }

    private createFillResultYield(
        fillResult: Awaited<ReturnType<typeof this.waitForFillWithTimeout>>,
        orderId: Hex,
        openTxHash: Hex | undefined,
        lastUpdate: OrderTrackingUpdate,
        fillDeadline: number,
    ): OrderTrackerYield {
        if (fillResult.status === FillResultStatus.Finalized) {
            return {
                type: OrderTrackerYieldType.Update,
                update: this.createUpdate({
                    status: OrderStatus.Finalized,
                    orderId,
                    openTxHash,
                    fillTxHash: fillResult.fillTxHash,
                    message: fillResult.blockNumber
                        ? `Order completed in block ${fillResult.blockNumber}`
                        : "Order completed",
                }),
            };
        }

        if (fillResult.status === FillResultStatus.Failed) {
            return {
                type: OrderTrackerYieldType.Update,
                update: this.createUpdate({
                    status: OrderStatus.Failed,
                    orderId,
                    openTxHash,
                    message: "Order failed",
                    failureReason: fillResult.failureReason,
                }),
            };
        }

        if (fillResult.status === FillResultStatus.DeadlineExceeded) {
            return {
                type: OrderTrackerYieldType.Update,
                update: this.createUpdate({
                    status: OrderStatus.Failed,
                    orderId,
                    openTxHash,
                    message: "Deadline exceeded before fill",
                    failureReason: OrderFailureReason.DeadlineExceeded,
                }),
            };
        }

        return this.createTimeoutYield(lastUpdate, fillDeadline, "Stopped watching after timeout");
    }

    /**
     * Start tracking an order with event-based updates.
     * Only supported for user-open orders (by txHash).
     * For escrow orders, use watchOrder() generator directly.
     *
     * @param params - Watch parameters (must include txHash)
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
        if (!params.txHash) {
            throw new Error(
                "startTracking() only supports txHash. Use watchOrder() for escrow orders.",
            );
        }

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
        const deadlineSuffix = fillDeadline
            ? ` before deadline at ${new Date(fillDeadline * 1000).toISOString()}`
            : "";
        return {
            type: OrderTrackerYieldType.Timeout,
            payload: {
                lastUpdate,
                timestamp: Math.floor(Date.now() / 1000),
                message: `${reason}. Order may still finalize${deadlineSuffix}`,
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
            orderId: Hex;
            openTxHash?: Hex;
            originChainId: number;
            destinationChainId: number;
            user?: Hex;
            fillDeadline?: number;
        },
        timeout: number,
    ): Promise<
        | {
              status: typeof FillResultStatus.Finalized;
              fillTxHash: Hex;
              blockNumber?: bigint;
          }
        | { status: typeof FillResultStatus.Failed; failureReason?: OrderFailureReason }
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
            if (error instanceof Error && error.name === "FillFailedError") {
                return {
                    status: FillResultStatus.Failed,
                    failureReason: OrderFailureReason.Unknown,
                };
            }
            if (error instanceof Error && error.name === "FillTimeoutError") {
                const nowSeconds = Math.floor(Date.now() / 1000);
                const isDeadlineExceeded =
                    fillParams.fillDeadline && nowSeconds > fillParams.fillDeadline;

                return isDeadlineExceeded
                    ? { status: FillResultStatus.DeadlineExceeded }
                    : { status: FillResultStatus.Timeout };
            }
            throw error;
        }
    }
}
