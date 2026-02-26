import { APIBasedFillWatcherConfig } from "../services/APIBasedFillWatcher.js";
import { EventBasedFillWatcherConfig } from "../services/EventBasedFillWatcher.js";
import {
    FillEvent,
    GetFillParams,
    OrderFailureReason,
    OrderStatus,
} from "../types/orderTracking.js";

export interface FillWatcher {
    /**
     * Get the current fill status on the destination chain
     * Performs a single query to check for fill events
     *
     * @param params - Parameters for getting the fill
     * @returns Fill event data (null if not filled), order status, and optional failure reason
     */
    getFill(params: GetFillParams): Promise<{
        fillEvent: FillEvent | null;
        status: OrderStatus;
        failureReason?: OrderFailureReason;
        fillTxHash?: string;
    }>;

    /**
     * Wait for a fill with timeout
     * Polls until fill is found or timeout is reached
     *
     * @param params - Parameters for getting the fill
     * @param timeout - Timeout in milliseconds (default: 5 minutes)
     * @returns Fill event data
     * @throws {FillTimeoutError} If timeout is reached before fill
     */
    waitForFill(params: GetFillParams, timeout?: number): Promise<FillEvent>;
}

/**
 * Union type supporting both onchain and API-based tracking
 */
export type FillWatcherConfig = EventBasedFillWatcherConfig | APIBasedFillWatcherConfig;

// Re-export for convenience
export type { APIBasedFillWatcherConfig, EventBasedFillWatcherConfig };
