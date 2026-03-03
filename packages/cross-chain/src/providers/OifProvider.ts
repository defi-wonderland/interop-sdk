import {
    GetQuoteResponse,
    Order as OifOrder,
    PostOrderRequest,
    PostOrderResponse,
} from "@openintentsframework/oif-specs";
import axios, { AxiosError } from "axios";
import { Hex, hexToBytes } from "viem";
import { ZodError } from "zod";

import type { ProviderExecutableQuote, ProviderQuote } from "../interfaces/quotes.interface.js";
import type { Quote, SubmitOrderResponse } from "../schemas/quote.js";
import type { QuoteRequest } from "../schemas/quoteRequest.js";
import {
    adaptOrderStatus,
    adaptPostOrderRequest,
    adaptQuote,
    adaptQuoteRequest,
    adaptTypedDataPayload,
} from "../adapters/index.js";
import {
    APIBasedFillWatcherConfig,
    CrossChainProvider,
    FillEvent,
    FillWatcherConfig,
    GetFillParams,
    getOrderResponseSchema,
    getQuoteResponseSchema,
    OIFAssetDiscoveryConfig,
    OifProviderConfig,
    OifProviderConfigSchema,
    OpenedIntentParserConfig,
    OrderFailureReason,
    OrderStatus,
    ProviderConfigFailure,
    ProviderExecuteFailure,
    ProviderExecuteNotImplemented,
    ProviderGetQuoteFailure,
} from "../internal.js";
import { isSignableOifOrder } from "../utils/orderTypeHelpers.js";

/**
 * OIF Provider implementation
 * @description Implements the CrossChainProvider interface to communicate with OIF-compliant solvers
 * via the standardized HTTP API defined in https://github.com/openintentsframework/oif-solver
 */
export class OifProvider extends CrossChainProvider {
    readonly protocolName = "oif";
    readonly providerId: string;

    private readonly solverId: string;
    private readonly url: string;
    private readonly headers?: Record<string, string>;
    private readonly adapterMetadata?: Record<string, unknown>;
    private readonly supportedLocks?: string[];
    private readonly submissionModes?: ("user-transaction" | "gasless")[];

    constructor(config: OifProviderConfig) {
        super();

        try {
            const configParsed = OifProviderConfigSchema.parse(config);
            this.solverId = configParsed.solverId;
            this.url = configParsed.url;
            this.headers = configParsed.headers;
            this.adapterMetadata = configParsed.adapterMetadata;
            this.providerId = configParsed.providerId ?? configParsed.solverId;
            this.supportedLocks = configParsed.supportedLocks;
            this.submissionModes = configParsed.submissionModes;
        } catch (error) {
            if (error instanceof ZodError) {
                throw new ProviderConfigFailure(
                    "Failed to parse OIF provider config",
                    error.message,
                    error.stack,
                );
            }
            throw new ProviderConfigFailure(
                "Failed to configure OIF provider",
                String(error),
                error instanceof Error ? error.stack : undefined,
            );
        }
    }

    private static readonly SUBMIT_TIMEOUT_MS = 5000;
    private static readonly MAX_SUBMIT_RETRIES = 3;
    private static readonly REQUEST_TIMEOUT_MS = 30000;

    /**
     * @inheritdoc
     */
    async getQuotes(params: QuoteRequest): Promise<Quote[]> {
        try {
            // 1. Convert SDK → OIF wire format
            const oifRequest = adaptQuoteRequest(params, {
                supportedLocks: this.supportedLocks,
                submissionModes: this.submissionModes,
            });

            const response = await axios.post<GetQuoteResponse>(
                `${this.url}/v1/quotes`,
                oifRequest,
                {
                    headers: {
                        "Content-Type": "application/json",
                        ...this.headers,
                    },
                    timeout: OifProvider.REQUEST_TIMEOUT_MS,
                },
            );

            if (response.status !== 200) {
                throw new ProviderGetQuoteFailure(
                    "Failed to get OIF quotes",
                    `Unexpected status code: ${response.status}. SolverId: ${this.solverId}, URL: ${this.url}/v1/quotes`,
                );
            }

            // Validate but use raw data (Zod reorders fields, breaks integrity checksum)
            getQuoteResponseSchema.parse(response.data);
            const { quotes } = response.data as GetQuoteResponse;

            // 2. Map OIF quotes → ProviderQuote (with typedData normalization)
            const providerQuotes: ProviderQuote[] = quotes.map((quote): ProviderQuote => {
                const adaptedQuote = adaptTypedDataPayload(quote);
                return {
                    ...adaptedQuote,
                    metadata: {
                        ...adaptedQuote.metadata,
                        ...(this.adapterMetadata && { adapterMetadata: this.adapterMetadata }),
                    },
                };
            });

            // 3. Convert to SDK quotes, stashing originals in metadata
            return providerQuotes.map((pq) => {
                const sdkQuote = adaptQuote(pq);
                sdkQuote.metadata = {
                    ...sdkQuote.metadata,
                    _oifProviderQuote: pq,
                };
                return sdkQuote;
            });
        } catch (error) {
            if (error instanceof AxiosError) {
                const errorData = error.response?.data as { message?: string };
                const baseMessage =
                    errorData?.message ||
                    (error.cause as Error | undefined)?.message ||
                    error.message ||
                    "Failed to get OIF quotes";
                const contextMessage = `${baseMessage}. SolverId: ${this.solverId}, URL: ${this.url}/v1/quotes`;
                throw new ProviderGetQuoteFailure(
                    "Failed to get OIF quotes from solver",
                    contextMessage,
                    error.stack,
                );
            } else if (error instanceof ZodError) {
                throw new ProviderGetQuoteFailure(
                    "Failed to validate OIF quote response",
                    `${error.message}. SolverId: ${this.solverId}`,
                    error.stack,
                );
            } else if (error instanceof ProviderGetQuoteFailure) {
                throw error;
            }
            throw new ProviderGetQuoteFailure(
                "Failed to get OIF quotes",
                `${String(error)}. SolverId: ${this.solverId}`,
                error instanceof Error ? error.stack : undefined,
            );
        }
    }

    /**
     * @inheritdoc
     */
    override async submitOrder(quote: Quote, signature: Hex): Promise<SubmitOrderResponse> {
        const providerQuote = quote.metadata?._oifProviderQuote as ProviderQuote | undefined;
        if (!providerQuote) {
            throw new ProviderExecuteFailure(
                "Missing OIF provider quote in metadata — was this quote obtained from OifProvider.getQuotes()?",
                `quoteId: ${quote.quoteId}`,
            );
        }

        if (!isSignableOifOrder(providerQuote.order as OifOrder)) {
            throw new ProviderExecuteNotImplemented(
                `Execute not supported for order type: ${(providerQuote.order as { type: string }).type}`,
            );
        }

        const signatureBytes = hexToBytes(signature);
        const request: PostOrderRequest = {
            order: providerQuote.order as OifOrder,
            signature: signatureBytes,
            quoteId: providerQuote.quoteId,
        };

        const pExecQuote = {
            ...providerQuote,
            _providerId: this.providerId,
        } as ProviderExecutableQuote;
        const adaptedRequest = adaptPostOrderRequest(request, pExecQuote);

        try {
            let lastErr: unknown;
            for (let i = 0; i < OifProvider.MAX_SUBMIT_RETRIES; i++) {
                try {
                    const response = await axios.post<PostOrderResponse>(
                        `${this.url}/v1/orders`,
                        adaptedRequest,
                        {
                            headers: { "Content-Type": "application/json", ...this.headers },
                            timeout: OifProvider.SUBMIT_TIMEOUT_MS,
                        },
                    );

                    const oifResponse = response.data;
                    if (!oifResponse.orderId) {
                        throw new Error(
                            `Solver returned no orderId (status: ${oifResponse.status})`,
                        );
                    }
                    return {
                        orderId: oifResponse.orderId as Hex,
                        status: oifResponse.status,
                        message: oifResponse.message,
                    };
                } catch (e) {
                    lastErr = e;
                    // Only retry on server errors (5xx); break on client errors or non-network failures
                    if (!(e instanceof AxiosError) || (e.response && e.response.status < 500))
                        break;
                }
            }
            throw lastErr;
        } catch (error) {
            if (error instanceof AxiosError) {
                const errorData = error.response?.data as { message?: string };
                const baseMessage =
                    errorData?.message ||
                    (error.cause as Error | undefined)?.message ||
                    error.message ||
                    "Failed to submit order";
                const contextMessage = `${baseMessage}. SolverId: ${this.solverId}, QuoteId: ${request.quoteId}, URL: ${this.url}/v1/orders`;
                throw new ProviderExecuteFailure(
                    "Failed to submit order to solver",
                    contextMessage,
                    error.stack,
                );
            } else if (error instanceof ProviderExecuteFailure) {
                throw error;
            }
            throw new ProviderExecuteFailure(
                "Failed to submit order to solver",
                `${String(error)}. SolverId: ${this.solverId}, QuoteId: ${request.quoteId}`,
                error instanceof Error ? error.stack : undefined,
            );
        }
    }

    static getFillWatcherConfig(baseUrl: string): APIBasedFillWatcherConfig<unknown> {
        return {
            type: "api-based",
            baseUrl,
            pollingInterval: 5000,
            retry: {
                maxAttempts: 3,
                initialDelay: 1000,
                maxDelay: 10000,
                backoffMultiplier: 2,
            },
            buildEndpoint: (params) => `/v1/orders/${params.orderId}`,
            extractFillEvent: (
                response: unknown,
                params: GetFillParams,
            ): {
                event: FillEvent | null;
                status: OrderStatus;
                failureReason?: OrderFailureReason;
                metadata?: unknown;
                fillTxHash?: string;
            } => {
                const validatedResponse = getOrderResponseSchema.parse(response);
                const status = adaptOrderStatus(validatedResponse.status);

                let failureReason: OrderFailureReason | undefined;
                if (status === OrderStatus.Failed) {
                    failureReason = OrderFailureReason.Unknown;
                }

                const isFinalized = status === OrderStatus.Finalized;
                const fillTxHash = (validatedResponse.fillTxHash ??
                    validatedResponse.fillTransaction?.hash) as Hex | undefined;

                if (!isFinalized || !fillTxHash) {
                    return { event: null, status, failureReason, fillTxHash };
                }

                const event: FillEvent = {
                    fillTxHash,
                    timestamp:
                        validatedResponse.updatedAt ??
                        validatedResponse.createdAt ??
                        Math.floor(Date.now() / 1000),
                    originChainId: params.originChainId,
                    orderId: params.orderId,
                };

                return { event, status, failureReason };
            },
        };
    }

    getTrackingConfig(): {
        openedIntentParserConfig: OpenedIntentParserConfig;
        fillWatcherConfig: FillWatcherConfig;
    } {
        return {
            openedIntentParserConfig: { type: "oif" },
            fillWatcherConfig: OifProvider.getFillWatcherConfig(this.url),
        };
    }

    override getDiscoveryConfig(): OIFAssetDiscoveryConfig {
        return {
            type: "oif" as const,
            config: {
                baseUrl: this.url,
                solverId: this.solverId,
                headers: this.headers,
            },
        };
    }
}
