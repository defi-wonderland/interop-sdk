import type { HttpClient } from "../../../internal.js";
import type {
    SuperbridgeActivityResponse,
    SuperbridgeRoutesRequest,
    SuperbridgeRoutesResponse,
    SuperbridgeSubmitGaslessRequest,
    SuperbridgeSubmitGaslessResponse,
} from "../schemas.js";
import { HttpError, ProviderExecuteFailure, ProviderGetQuoteFailure } from "../../../internal.js";
import {
    SuperbridgeActivityResponseSchema,
    SuperbridgeRoutesRequestSchema,
    SuperbridgeRoutesResponseSchema,
    SuperbridgeSubmitGaslessRequestSchema,
    SuperbridgeSubmitGaslessResponseSchema,
} from "../schemas.js";

/**
 * HTTP client for the Superbridge API.
 * Encapsulates all HTTP calls and response parsing.
 */
export class SuperbridgeApiService {
    constructor(private readonly http: HttpClient) {}

    /** POST /v1/routes — fetch bridging routes from Superbridge. */
    async getRoutes(params: SuperbridgeRoutesRequest): Promise<SuperbridgeRoutesResponse> {
        try {
            const parsed = SuperbridgeRoutesRequestSchema.parse(params);
            const response = await this.http.post("/v1/routes", parsed);
            return SuperbridgeRoutesResponseSchema.parse(response.data);
        } catch (error) {
            this.throwProviderError(error, ProviderGetQuoteFailure, "Superbridge routes");
        }
    }

    /** GET /v1/activity — fetch the activity (status, steps) for a transaction. */
    async getActivity(txHash: string): Promise<SuperbridgeActivityResponse> {
        try {
            const response = await this.http.get(`/v1/activity?txHash=${txHash}`);
            return SuperbridgeActivityResponseSchema.parse(response.data);
        } catch (error) {
            this.throwProviderError(error, ProviderExecuteFailure, "Superbridge activity");
        }
    }

    /** POST /v1/submit_gasless — submit a signed gasless transaction. */
    async submitGasless(
        params: SuperbridgeSubmitGaslessRequest,
    ): Promise<SuperbridgeSubmitGaslessResponse> {
        try {
            const parsed = SuperbridgeSubmitGaslessRequestSchema.parse(params);
            const response = await this.http.post("/v1/submit_gasless", parsed);
            return SuperbridgeSubmitGaslessResponseSchema.parse(response.data);
        } catch (error) {
            this.throwProviderError(
                error,
                ProviderExecuteFailure,
                "Superbridge gasless submission",
            );
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
                `${operation} rate limit exceeded`,
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

    /** Try to read the `message` field from a Superbridge API error response body. */
    private extractApiMessage(error: HttpError): string | undefined {
        const data: unknown = error.data;
        if (
            data !== null &&
            typeof data === "object" &&
            "message" in data &&
            typeof data.message === "string"
        ) {
            return data.message;
        }
        return undefined;
    }
}
