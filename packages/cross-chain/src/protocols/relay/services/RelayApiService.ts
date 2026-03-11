import type { AxiosInstance } from "axios";
import { AxiosError } from "axios";
import { ZodError } from "zod";

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
    RelayBadRequestResponseSchema,
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
            if (error instanceof AxiosError) {
                const parsed = RelayBadRequestResponseSchema.safeParse(error.response?.data);
                const message = parsed.success
                    ? parsed.data.message
                    : (error.message ?? "Failed to get Relay quote");
                throw new ProviderGetQuoteFailure(
                    "Failed to get Relay quote",
                    message,
                    error.stack,
                );
            } else if (error instanceof ZodError) {
                throw new ProviderGetQuoteFailure(
                    "Failed to parse Relay quote",
                    error.message,
                    error.stack,
                );
            }
            throw new ProviderGetQuoteFailure(
                "Failed to get Relay quotes",
                String(error),
                error instanceof Error ? error.stack : undefined,
            );
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
            if (error instanceof AxiosError) {
                throw new ProviderGetStatusFailure(
                    "Failed to get Relay intent status",
                    error.message,
                    error.stack,
                );
            }
            throw error;
        }
    }

    /** POST /transactions/index — notify Relay about a deposit transaction. */
    async indexTransaction(
        params: RelayIndexTransactionRequest,
    ): Promise<RelayIndexTransactionResponse> {
        try {
            const parsed = RelayIndexTransactionRequestSchema.parse(params);
            const response = await this.http.post("/transactions/index", parsed);
            return RelayIndexTransactionResponseSchema.parse(response.data);
        } catch (error) {
            if (error instanceof AxiosError) {
                throw new ProviderGetStatusFailure(
                    "Failed to index Relay transaction",
                    error.message,
                    error.stack,
                );
            } else if (error instanceof ZodError) {
                throw new ProviderGetStatusFailure(
                    "Failed to validate Relay index transaction",
                    error.message,
                    error.stack,
                );
            }
            throw error;
        }
    }
}
