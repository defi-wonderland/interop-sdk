import type { AxiosInstance } from "axios";
import { AxiosError } from "axios";

import type {
    RelayIndexTransactionRequest,
    RelayIndexTransactionResponse,
    RelayIntentStatusRequest,
    RelayIntentStatusResponse,
    RelayQuoteRequest,
    RelayQuoteResponse,
} from "../schemas.js";
import { ProviderGetQuoteFailure, ProviderGetStatusFailure } from "../../../internal.js";
import {
    RelayIndexTransactionRequestSchema,
    RelayIndexTransactionResponseSchema,
    RelayIntentStatusRequestSchema,
    RelayIntentStatusResponseSchema,
    RelayQuoteRequestSchema,
    RelayQuoteResponseSchema,
} from "../schemas.js";

/**
 * HTTP client for the Relay API.
 * Encapsulates all HTTP calls and response parsing.
 */
export class RelayApiService {
    constructor(private readonly http: AxiosInstance) {}

    /** POST /quote/v2 — fetch a bridge quote from Relay. */
    async getQuote(params: RelayQuoteRequest): Promise<RelayQuoteResponse> {
        try {
            const parsed = RelayQuoteRequestSchema.parse(params);
            const response = await this.http.post("/quote/v2", parsed);
            return RelayQuoteResponseSchema.parse(response.data);
        } catch (error) {
            this.throwProviderError(error, ProviderGetQuoteFailure, "Relay quote");
        }
    }

    /** POST /transactions/index — notify Relay of a deposit transaction for faster solver indexing. */
    async indexTransaction(
        params: RelayIndexTransactionRequest,
    ): Promise<RelayIndexTransactionResponse> {
        try {
            const parsed = RelayIndexTransactionRequestSchema.parse(params);
            const response = await this.http.post("/transactions/index", parsed);
            return RelayIndexTransactionResponseSchema.parse(response.data);
        } catch (error) {
            this.throwProviderError(error, ProviderGetStatusFailure, "Relay index transaction");
        }
    }

    /** GET /intents/status/v3 — check the status of a Relay intent. */
    async getStatus(params: RelayIntentStatusRequest): Promise<RelayIntentStatusResponse> {
        try {
            const parsed = RelayIntentStatusRequestSchema.parse(params);
            const response = await this.http.get("/intents/status/v3", {
                params: parsed,
            });
            return RelayIntentStatusResponseSchema.parse(response.data);
        } catch (error) {
            this.throwProviderError(error, ProviderGetStatusFailure, "Relay intent status");
        }
    }

    /** Wrap any caught error into the appropriate provider failure and re-throw. */
    private throwProviderError(
        error: unknown,
        ErrorClass: new (message: string, cause?: string, stack?: string) => Error,
        operation: string,
    ): never {
        const cause =
            error instanceof AxiosError
                ? (this.extractApiMessage(error) ?? error.message)
                : error instanceof Error
                  ? error.message
                  : String(error);

        throw new ErrorClass(
            `Failed to get ${operation}`,
            cause,
            error instanceof Error ? error.stack : undefined,
        );
    }

    /** Try to read the `message` field from a Relay API error response body. */
    private extractApiMessage(error: AxiosError): string | undefined {
        const message = (error.response?.data as { message?: unknown })?.message;
        return typeof message === "string" ? message : undefined;
    }
}
