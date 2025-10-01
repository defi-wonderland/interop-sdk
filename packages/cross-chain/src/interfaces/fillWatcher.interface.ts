import { FillEvent, WatchFillParams } from "../internal.js";

/**
 * Interface for protocol-specific fill watchers
 * Each protocol implements this to watch for fills on destination chains
 *
 * Different protocols may:
 * - Use different contract addresses
 * - Emit different fill events
 * - Have different fill mechanisms
 *
 * This interface abstracts those differences
 */
export interface FillWatcher {
    /**
     * Watch for a fill on the destination chain
     * Uses polling to check for fill events
     *
     * @param params - Parameters for watching the fill
     * @returns Fill event data if found, null if not yet filled
     */
    watchFill(params: WatchFillParams): Promise<FillEvent | null>;

    /**
     * Wait for a fill with timeout
     * Polls until fill is found or timeout is reached
     *
     * @param params - Parameters for watching the fill
     * @param timeout - Timeout in milliseconds (default: 5 minutes)
     * @returns Fill event data
     * @throws {FillTimeoutError} If timeout is reached before fill
     */
    waitForFill(params: WatchFillParams, timeout?: number): Promise<FillEvent>;
}
