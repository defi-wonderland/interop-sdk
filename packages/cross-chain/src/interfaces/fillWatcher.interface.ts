import { FillEvent, GetFillParams } from "../internal.js";

export interface FillWatcher {
    /**
     * Get the current fill status on the destination chain
     * Performs a single query to check for fill events
     *
     * @param params - Parameters for getting the fill
     * @returns Fill event data if found, null if not yet filled
     */
    getFill(params: GetFillParams): Promise<FillEvent | null>;

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
