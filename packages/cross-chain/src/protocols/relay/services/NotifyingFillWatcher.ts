import type { FillWatcher } from "../../../core/interfaces/fillWatcher.interface.js";
import type {
    FillEvent,
    GetFillParams,
    OrderFailureReason,
    OrderStatus,
} from "../../../core/types/orderTracking.js";
import type { SolverNotifier } from "../interfaces/index.js";

/**
 * {@link FillWatcher} decorator that runs a {@link SolverNotifier} once per
 * orderId before delegating to the inner watcher.
 *
 * Owns the idempotency Set. Notification errors are swallowed (best-effort).
 */
export class NotifyingFillWatcher implements FillWatcher {
    private readonly notifiedOrders = new Set<string>();

    constructor(
        private readonly inner: FillWatcher,
        private readonly notifier: SolverNotifier,
    ) {}

    async getFill(params: GetFillParams): Promise<{
        fillEvent: FillEvent | null;
        status: OrderStatus;
        failureReason?: OrderFailureReason;
        fillTxHash?: string;
    }> {
        await this.notifyOnce(params);
        return this.inner.getFill(params);
    }

    async waitForFill(params: GetFillParams, timeout?: number): Promise<FillEvent> {
        await this.notifyOnce(params);
        return this.inner.waitForFill(params, timeout);
    }

    /** Notify solver once per orderId. Errors are swallowed. */
    private async notifyOnce(params: GetFillParams): Promise<void> {
        if (this.notifiedOrders.has(params.orderId)) return;

        this.notifiedOrders.add(params.orderId);
        try {
            await this.notifier.notify(params);
        } catch {
            console.warn("[NotifyingFillWatcher] solver notification failed, continuing");
        }
    }
}
