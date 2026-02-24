import {
    FillEvent,
    FillWatcher,
    GetFillParams,
    OrderFailureReason,
    OrderStatus,
} from "../internal.js";
import { FillFailedError, FillTimeoutError } from "./EventBasedFillWatcher.js";

/**
 * Configuration for API-based (offchain) fill watching
 */
export interface APIBasedFillWatcherConfig<TResponse = unknown, TMetadata = unknown> {
    /** Discriminator for FillWatcher config union */
    type: "api-based";
    /** Base API endpoint URL */
    baseUrl: string;
    /** Optional API key or auth token */
    apiKey?: string;
    /** Optional custom headers */
    headers?: Record<string, string>;
    /** Polling interval in milliseconds (default: 5000) */
    pollingInterval?: number;
    /**
     * Retry configuration for API requests
     * Uses exponential backoff strategy
     */
    retry?: {
        /** Maximum retry attempts (default: 3) */
        maxAttempts?: number;
        /** Initial delay in ms (default: 1000) */
        initialDelay?: number;
        /** Maximum delay in ms (default: 10000) */
        maxDelay?: number;
        /** Backoff multiplier (default: 2) */
        backoffMultiplier?: number;
    };
    /**
     * Function to build the API endpoint URL from fill params
     * @example (params) => `/v1/orders/${params.orderId}`
     */
    buildEndpoint: (params: GetFillParams) => string;
    /**
     * Function to extract FillEvent and status from API response
     * Returns the actual order status from the API
     * Returns null event if order is not yet filled (pending, failed, etc.)
     * Can return extended metadata and failure reason when applicable
     */
    extractFillEvent: (
        response: TResponse,
        params: GetFillParams,
    ) => {
        event: FillEvent | null;
        status: OrderStatus;
        failureReason?: OrderFailureReason;
        metadata?: TMetadata;
        /** Fill tx hash when available from intermediate statuses (e.g. executing) */
        fillTxHash?: string;
    };
}

/**
 * API-based fill watcher
 * Polls HTTP endpoints to check for fill status
 * Supports retry logic with exponential backoff
 */
export class APIBasedFillWatcher<TResponse = unknown, TMetadata = unknown> implements FillWatcher {
    private readonly defaultRetry = {
        maxAttempts: 3,
        initialDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
    };

    constructor(private readonly config: APIBasedFillWatcherConfig<TResponse, TMetadata>) {}

    /**
     * Fetch with exponential backoff retry logic
     * Retries on 5xx errors and 429 rate limits
     * Does not retry on 4xx errors (except 429)
     */
    private async fetchWithRetry(url: string, headers: Record<string, string>): Promise<Response> {
        const retry = { ...this.defaultRetry, ...this.config.retry };
        let lastError: Error | undefined;

        for (let attempt = 1; attempt <= retry.maxAttempts; attempt++) {
            try {
                const response = (await fetch(url, { headers })) as Response;

                if (response.status >= 400 && response.status < 500 && response.status !== 429) {
                    return response;
                }

                if (response.status >= 500 || response.status === 429) {
                    if (attempt < retry.maxAttempts) {
                        const delay = Math.min(
                            retry.initialDelay * Math.pow(retry.backoffMultiplier, attempt - 1),
                            retry.maxDelay,
                        );
                        console.warn(
                            `API request failed with status ${response.status}, retrying in ${delay}ms (attempt ${attempt}/${retry.maxAttempts})`,
                        );
                        await new Promise((resolve) => setTimeout(resolve, delay));
                        continue;
                    }
                }

                return response;
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));

                if (attempt < retry.maxAttempts) {
                    const delay = Math.min(
                        retry.initialDelay * Math.pow(retry.backoffMultiplier, attempt - 1),
                        retry.maxDelay,
                    );
                    console.warn(
                        `API request failed: ${lastError.message}, retrying in ${delay}ms (attempt ${attempt}/${retry.maxAttempts})`,
                    );
                    await new Promise((resolve) => setTimeout(resolve, delay));
                    continue;
                }
            }
        }

        throw new Error(
            `Failed to fetch after ${retry.maxAttempts} attempts: ${lastError?.message || "Unknown error"}`,
        );
    }

    /**
     * Get the current fill status from API (single check)
     *
     * @param params - Parameters for getting the fill (includes orderId and openTxHash)
     * @returns Fill event data (null if not filled), order status, and optional failure reason from API
     * @throws {Error} If API request fails critically
     */
    async getFill(params: GetFillParams): Promise<{
        fillEvent: FillEvent<TMetadata> | null;
        status: OrderStatus;
        failureReason?: OrderFailureReason;
        fillTxHash?: string;
    }> {
        const endpoint = this.config.buildEndpoint(params);
        const url = `${this.config.baseUrl}${endpoint}`;

        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            ...this.config.headers,
        };
        if (this.config.apiKey) {
            headers["Authorization"] = `Bearer ${this.config.apiKey}`;
        }

        try {
            const response = await this.fetchWithRetry(url, headers);

            if (response.status === 404) {
                return { fillEvent: null, status: OrderStatus.Pending, failureReason: undefined };
            }

            if (!response.ok) {
                throw new Error(
                    `API request failed with status ${response.status}: ${response.statusText}`,
                );
            }

            const data = (await response.json()) as TResponse;

            const { event, status, failureReason, metadata, fillTxHash } =
                this.config.extractFillEvent(data, params);

            const fillEvent = event
                ? metadata
                    ? ({ ...event, metadata } as FillEvent<TMetadata>)
                    : (event as FillEvent<TMetadata>)
                : null;

            return { fillEvent, status, failureReason, fillTxHash };
        } catch (error) {
            console.error(
                `Error fetching fill from API: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
            return { fillEvent: null, status: OrderStatus.Pending, failureReason: undefined };
        }
    }

    /**
     * Wait for a fill with polling and timeout
     *
     * @param params - Parameters for getting the fill
     * @param timeout - Timeout in milliseconds (default: 3 minutes)
     * @returns Fill event data
     * @throws {FillTimeoutError} If timeout is reached before fill
     * @throws {Error} If timeout is not positive
     */
    async waitForFill(
        params: GetFillParams,
        timeout: number = 3 * 60 * 1000,
    ): Promise<FillEvent<TMetadata>> {
        if (timeout <= 0) {
            throw new Error(`Timeout must be positive, got ${timeout}ms`);
        }

        const pollingInterval = this.config.pollingInterval || 5000;
        const startTime = Date.now();

        const terminalFailures = new Set([OrderStatus.Failed, OrderStatus.Refunded]);
        const terminalSuccess = new Set([OrderStatus.Finalized]);

        while (Date.now() - startTime < timeout) {
            const { fillEvent, status, failureReason } = await this.getFill(params);

            if (fillEvent) {
                return fillEvent;
            }

            if (terminalFailures.has(status)) {
                throw new FillFailedError(params.orderId, status, failureReason);
            }

            // Finalized/Settled but extractFillEvent couldn't build a FillEvent (e.g. missing fillTxHash)
            // Stop polling — don't loop forever on a terminal status
            if (terminalSuccess.has(status)) {
                throw new FillFailedError(
                    params.orderId,
                    status,
                    "Order finalized but fill transaction hash unavailable",
                );
            }

            await new Promise((resolve) => setTimeout(resolve, pollingInterval));
        }

        throw new FillTimeoutError(params.orderId, timeout);
    }
}
