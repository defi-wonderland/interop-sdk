import type {
    GetQuoteRequest,
    GetQuoteResponse,
    PostOrderResponse,
} from "@openintentsframework/oif-specs";
import {
    getOrderResponseSchema,
    getQuoteResponseSchema,
    ProviderExecuteFailure,
    ProviderGetQuoteFailure,
} from "@wonderland/interop-cross-chain";
import axios, { AxiosError } from "axios";
import { ZodError } from "zod";

export interface OIFClientConfig {
    solverId: string;
    url: string;
    headers?: Record<string, string>;
    adapterMetadata?: Record<string, unknown>;
}

export class OIFClient {
    private static readonly TIMEOUT_MS = 30_000;

    readonly solverId: string;
    readonly url: string;
    readonly headers?: Record<string, string>;
    readonly adapterMetadata?: Record<string, unknown>;

    constructor(config: OIFClientConfig) {
        this.solverId = config.solverId;
        this.url = config.url;
        this.headers = config.headers;
        this.adapterMetadata = config.adapterMetadata;
    }

    async fetchQuotes(params: GetQuoteRequest): Promise<GetQuoteResponse> {
        try {
            const response = await axios.post<GetQuoteResponse>(`${this.url}/v1/quotes`, params, {
                headers: { "Content-Type": "application/json", ...this.headers },
                timeout: OIFClient.TIMEOUT_MS,
            });

            if (response.status !== 200) {
                throw new ProviderGetQuoteFailure(
                    "Failed to get OIF quotes",
                    `Status ${response.status}. Solver: ${this.solverId}`,
                );
            }

            getQuoteResponseSchema.parse(response.data);
            return response.data as GetQuoteResponse;
        } catch (error) {
            if (error instanceof ProviderGetQuoteFailure) throw error;
            if (error instanceof AxiosError) {
                const msg =
                    (error.response?.data as { message?: string })?.message ?? error.message;
                throw new ProviderGetQuoteFailure(
                    "Failed to get OIF quotes",
                    `${msg}. Solver: ${this.solverId}`,
                    error.stack,
                );
            }
            if (error instanceof ZodError) {
                throw new ProviderGetQuoteFailure(
                    "Failed to validate OIF quote response",
                    `${error.message}. Solver: ${this.solverId}`,
                    error.stack,
                );
            }
            throw new ProviderGetQuoteFailure(
                "Failed to get OIF quotes",
                `${String(error)}. Solver: ${this.solverId}`,
            );
        }
    }

    async postOrder(request: Record<string, unknown>): Promise<PostOrderResponse> {
        try {
            const response = await axios.post<PostOrderResponse>(`${this.url}/v1/orders`, request, {
                headers: { "Content-Type": "application/json", ...this.headers },
                timeout: OIFClient.TIMEOUT_MS,
            });

            if (response.status !== 200) {
                throw new ProviderExecuteFailure(
                    "Failed to submit order",
                    `Status ${response.status}. Solver: ${this.solverId}`,
                );
            }
            return response.data;
        } catch (error) {
            if (error instanceof ProviderExecuteFailure) throw error;
            if (error instanceof AxiosError) {
                const msg =
                    (error.response?.data as { message?: string })?.message ?? error.message;
                throw new ProviderExecuteFailure(
                    "Failed to submit order",
                    `${msg}. Solver: ${this.solverId}`,
                    error.stack,
                );
            }
            throw new ProviderExecuteFailure(
                "Failed to submit order",
                `${String(error)}. Solver: ${this.solverId}`,
            );
        }
    }

    async getOrderStatus(orderId: string): Promise<unknown> {
        const response = await axios.get(`${this.url}/v1/orders/${orderId}`, {
            headers: this.headers,
            timeout: OIFClient.TIMEOUT_MS,
        });

        const validated = getOrderResponseSchema.parse(response.data);
        return validated;
    }
}
