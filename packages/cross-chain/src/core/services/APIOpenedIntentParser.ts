import type { Hex } from "viem";

import type {
    APIOpenedIntentParserConfig,
    OpenedIntentParser,
} from "../interfaces/openedIntentParser.interface.js";
import type { OpenedIntent } from "../types/orderTracking.js";
import { APIRequestFailure } from "../errors/APIRequestFailure.exception.js";
import { OpenedIntentNotFoundError } from "../errors/OpenedIntentNotFound.exception.js";

/**
 * API-based opened intent parser.
 * Fetches intent data from a protocol's HTTP API instead of parsing on-chain events.
 *
 * Used by protocols like Relay that don't emit standard on-chain open events
 * and instead track intents via their own API.
 */
export class APIOpenedIntentParser<TResponse = unknown> implements OpenedIntentParser {
    constructor(private readonly config: APIOpenedIntentParserConfig<TResponse>) {}

    /**
     * Fetch opened intent information from the configured API endpoint.
     *
     * @param txHash - Transaction hash to look up
     * @param chainId - Chain ID where the transaction occurred
     * @returns Opened intent data needed for tracking
     * @throws {OpenedIntentNotFoundError} If the API returns a 404 status
     * @throws {APIRequestFailure} If the API returns any other non-OK status (401, 429, 5xx, etc.)
     */
    async getOpenedIntent(txHash: Hex, chainId: number): Promise<OpenedIntent> {
        const url = this.config.buildUrl(txHash, chainId);

        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            ...this.config.headers,
        };

        const response = await fetch(url, { headers });

        if (response.status === 404) {
            throw new OpenedIntentNotFoundError(txHash, this.config.protocolName);
        }

        if (!response.ok) {
            const body = await response.text();
            throw new APIRequestFailure(this.config.protocolName, response.status, body);
        }

        const data = (await response.json()) as TResponse;

        return this.config.extractOpenedIntent(data, txHash);
    }
}
