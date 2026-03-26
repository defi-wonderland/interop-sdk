import type { AxiosInstance } from "axios";
import { AxiosError } from "axios";

import type {
    BungeeQuoteRequest,
    BungeeQuoteResponse,
    BungeeStatusRequest,
    BungeeStatusResponse,
    BungeeSubmitRequest,
    BungeeSubmitResponse,
} from "../schemas.js";
import {
    ProviderExecuteFailure,
    ProviderGetQuoteFailure,
    ProviderGetStatusFailure,
} from "../../../internal.js";
import {
    BungeeQuoteRequestSchema,
    BungeeQuoteResponseSchema,
    BungeeStatusRequestSchema,
    BungeeStatusResponseSchema,
    BungeeSubmitRequestSchema,
    BungeeSubmitResponseSchema,
} from "../schemas.js";

/**
 * HTTP client for the Bungee API.
 * Encapsulates all HTTP calls and response parsing.
 */
export class BungeeApiService {
    constructor(private readonly http: AxiosInstance) {}

    /** GET /api/v1/bungee/quote — fetch a bridge quote from Bungee. */
    async getQuote(params: BungeeQuoteRequest): Promise<BungeeQuoteResponse> {
        try {
            const parsed = BungeeQuoteRequestSchema.parse(params);
            const response = await this.http.get("/api/v1/bungee/quote", { params: parsed });
            return BungeeQuoteResponseSchema.parse(response.data);
        } catch (error) {
            this.throwProviderError(error, ProviderGetQuoteFailure, "Bungee quote");
        }
    }

    /** POST /api/v1/bungee/submit — submit a signed order to Bungee. */
    async submitOrder(params: BungeeSubmitRequest): Promise<BungeeSubmitResponse> {
        try {
            const parsed = BungeeSubmitRequestSchema.parse(params);
            const response = await this.http.post("/api/v1/bungee/submit", parsed);
            return BungeeSubmitResponseSchema.parse(response.data);
        } catch (error) {
            this.throwProviderError(error, ProviderExecuteFailure, "Bungee submit");
        }
    }

    /** GET /api/v1/bungee/status — check the status of a Bungee request. */
    async getStatus(params: BungeeStatusRequest): Promise<BungeeStatusResponse> {
        try {
            const parsed = BungeeStatusRequestSchema.parse(params);
            const response = await this.http.get("/api/v1/bungee/status", { params: parsed });
            return BungeeStatusResponseSchema.parse(response.data);
        } catch (error) {
            this.throwProviderError(error, ProviderGetStatusFailure, "Bungee status");
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

    /** Try to read the `message` field from a Bungee API error response body. */
    private extractApiMessage(error: AxiosError): string | undefined {
        const message = (error.response?.data as { message?: unknown })?.message;
        return typeof message === "string" ? message : undefined;
    }
}
