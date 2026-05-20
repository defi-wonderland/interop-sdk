import type { HttpClient } from "../../../internal.js";
import type {
    BungeeBuildTxRequest,
    BungeeBuildTxResponse,
    BungeeQuoteRequest,
    BungeeQuoteResponse,
    BungeeStatusRequest,
    BungeeStatusResponse,
    BungeeSubmitRequest,
    BungeeSubmitResponse,
} from "../schemas.js";
import {
    HttpError,
    ProviderExecuteFailure,
    ProviderGetQuoteFailure,
    ProviderGetStatusFailure,
} from "../../../internal.js";
import {
    BungeeBuildTxRequestSchema,
    BungeeBuildTxResponseSchema,
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
    constructor(private readonly http: HttpClient) {}

    /** GET /api/v1/bungee/quote — fetch a bridge quote from Bungee. */
    async getQuote(params: BungeeQuoteRequest): Promise<BungeeQuoteResponse> {
        try {
            const parsed = BungeeQuoteRequestSchema.parse(params);
            const response = await this.http.get("/api/v1/bungee/quote", {
                params: parsed as Record<string, unknown>,
            });
            return BungeeQuoteResponseSchema.parse(response.data);
        } catch (error) {
            this.throwProviderError(error, ProviderGetQuoteFailure, "Bungee quote");
        }
    }

    /** GET /api/v1/bungee/build-tx — build the executable tx for a manual route. */
    async buildTx(params: BungeeBuildTxRequest): Promise<BungeeBuildTxResponse> {
        try {
            const parsed = BungeeBuildTxRequestSchema.parse(params);
            const response = await this.http.get("/api/v1/bungee/build-tx", {
                params: parsed as Record<string, unknown>,
            });
            return BungeeBuildTxResponseSchema.parse(response.data);
        } catch (error) {
            this.throwProviderError(error, ProviderGetQuoteFailure, "Bungee build-tx");
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
            const response = await this.http.get("/api/v1/bungee/status", {
                params: parsed as Record<string, unknown>,
            });
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
        if (error instanceof HttpError && error.status === 429) {
            throw new ErrorClass(
                `Bungee rate limit exceeded`,
                `Too many requests (429) for ${operation}`,
                error.stack,
            );
        }

        const cause =
            error instanceof HttpError
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

    /**
     * Extract an error message from a Bungee API error response body.
     *
     * Handles both flat string messages and nested error objects:
     * - `{ "message": "error string" }`
     * - `{ "message": { "error": "...", "details": { "error": { "message": "...", "code": "..." } } } }`
     */
    private extractApiMessage(error: HttpError): string | undefined {
        const data = error.data as { message?: unknown } | undefined;
        const message = data?.message;

        if (typeof message === "string") return message;

        if (typeof message === "object" && message !== null) {
            const msg = message as {
                error?: string;
                details?: { error?: { message?: string; code?: string } };
            };
            const parts: string[] = [];
            if (msg.error) parts.push(msg.error);
            if (msg.details?.error?.message) parts.push(msg.details.error.message);
            if (msg.details?.error?.code) parts.push(`code: ${msg.details.error.code}`);
            if (parts.length > 0) return parts.join(" — ");
        }

        return undefined;
    }
}
