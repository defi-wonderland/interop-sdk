import axios from "axios";

import type { PreTracker, PreTrackerParams } from "../interfaces/preTracker.interface.js";
import { APIRequestFailure } from "../errors/APIRequestFailure.exception.js";

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
            await axios.post(url, body, {
                headers: this.config.headers,
            });
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const status = error.response?.status ?? 0;
                const text =
                    typeof error.response?.data === "string"
                        ? error.response.data
                        : JSON.stringify(error.response?.data ?? error.message);
                throw new APIRequestFailure(this.config.protocolName, status, text);
            }
            throw error;
        }
    }
}
