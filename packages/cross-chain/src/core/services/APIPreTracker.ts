import type { PreTracker, PreTrackerParams } from "../interfaces/preTracker.interface.js";
import { APIRequestFailure } from "../errors/APIRequestFailure.exception.js";
import { HttpError, httpRequest } from "../utils/httpClient.js";

/**
 * Configuration for an API-based pre-tracker.
 */
export interface APIPreTrackerConfig {
    /** Discriminator for the pre-tracker config union */
    type: "api";
    /** Protocol name used in error messages */
    protocolName: string;
    /** Build the target URL for the POST request */
    buildUrl: () => string;
    /** Build the JSON body from the pre-tracker parameters */
    buildBody: (params: PreTrackerParams) => Record<string, unknown>;
    /** Optional custom headers */
    headers?: Record<string, string>;
    /** Optional request timeout in milliseconds (defaults to 15000) */
    timeoutMs?: number;
}

/**
 * Pre-tracker that notifies a protocol via an HTTP POST request.
 */
export class APIPreTracker implements PreTracker {
    constructor(private readonly config: APIPreTrackerConfig) {}

    /** {@inheritDoc PreTracker.execute} */
    async execute(params: PreTrackerParams): Promise<void> {
        const url = this.config.buildUrl();
        const body = this.config.buildBody(params);

        try {
            await httpRequest(url, {
                method: "POST",
                body,
                headers: this.config.headers,
                timeout: this.config.timeoutMs ?? 15000,
            });
        } catch (error) {
            if (error instanceof HttpError) {
                const text =
                    typeof error.data === "string"
                        ? error.data
                        : JSON.stringify(error.data ?? error.message);
                throw new APIRequestFailure(this.config.protocolName, error.status, text);
            }
            throw error;
        }
    }
}
