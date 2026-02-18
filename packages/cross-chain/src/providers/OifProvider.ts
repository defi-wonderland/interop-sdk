import {
    GetQuoteRequest,
    GetQuoteResponse,
    PostOrderRequest,
    PostOrderResponse,
    Quote,
} from "@openintentsframework/oif-specs";
import axios, { AxiosError } from "axios";
import { bytesToHex, Hex, hexToBytes, PrepareTransactionRequestReturnType } from "viem";
import { ZodError } from "zod";

import {
    adaptOrderStatus,
    adaptPostOrderRequest,
    adaptTypedDataPayload,
} from "../adapters/index.js";
import {
    APIBasedFillWatcherConfig,
    CrossChainProvider,
    ExecutableQuote,
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
    ProviderQuote,
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

    constructor(config: OifProviderConfig) {
        super();

        try {
            const configParsed = OifProviderConfigSchema.parse(config);
            this.solverId = configParsed.solverId;
            this.url = configParsed.url;
            this.headers = configParsed.headers;
            this.adapterMetadata = configParsed.adapterMetadata;
            this.providerId = configParsed.providerId ?? configParsed.solverId;
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

    /**
     * HTTP request timeout per attempt in milliseconds (5 seconds).
     * If the solver doesn't respond within this window the attempt is
     * cancelled and retried (up to MAX_SUBMIT_RETRIES times).
     */
    private static readonly SUBMIT_TIMEOUT_MS = 5000;
    private static readonly MAX_SUBMIT_RETRIES = 3;

    /**
     * HTTP request timeout in milliseconds (30 seconds)
     */
    private static readonly REQUEST_TIMEOUT_MS = 30000;

    /**
     * Prepare transaction for user-mode submission
     * @param quote - The quote containing order data
     * @returns Transaction request for user-open orders, undefined otherwise
     */
    private prepareTransaction(quote: Quote): PrepareTransactionRequestReturnType | undefined {
        try {
            if (quote.order.type !== "oif-user-open-v0") {
                return undefined;
            }

            return {
                to: quote.order.openIntentTx.to as Hex,
                data: bytesToHex(quote.order.openIntentTx.data),
            } as PrepareTransactionRequestReturnType;
        } catch {
            return undefined;
        }
    }

    /**
     * @inheritdoc
     */
    async getQuotes(params: GetQuoteRequest): Promise<ProviderQuote[]> {
        try {
            const response = await axios.post<GetQuoteResponse>(`${this.url}/v1/quotes`, params, {
                headers: {
                    "Content-Type": "application/json",
                    ...this.headers,
                },
                timeout: OifProvider.REQUEST_TIMEOUT_MS,
            });

            if (response.status !== 200) {
                throw new ProviderGetQuoteFailure(
                    "Failed to get OIF quotes",
                    `Unexpected status code: ${response.status}. SolverId: ${this.solverId}, URL: ${this.url}/v1/quotes`,
                );
            }

            // Validate but use raw data (Zod reorders fields, breaks integrity checksum)
            getQuoteResponseSchema.parse(response.data);
            const { quotes } = response.data as GetQuoteResponse;

            const providerQuotes: ProviderQuote[] = quotes.map((quote): ProviderQuote => {
                // WORKAROUND #286: Normalize EIP-712 typed data for viem compatibility
                const adaptedQuote = adaptTypedDataPayload(quote);
                const preparedTransaction = this.prepareTransaction(adaptedQuote);

                return {
                    ...adaptedQuote,
                    metadata: {
                        ...adaptedQuote.metadata,
                        ...(this.adapterMetadata && { adapterMetadata: this.adapterMetadata }),
                    },
                    preparedTransaction,
                };
            });

            return providerQuotes;
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
    async submitSignedOrder(
        quote: ExecutableQuote,
        signature: Hex | Uint8Array,
    ): Promise<PostOrderResponse> {
        if (!isSignableOifOrder(quote.order)) {
            throw new ProviderExecuteNotImplemented(
                `Execute not supported for order type: ${quote.order.type}`,
            );
        }

        const signatureBytes = typeof signature === "string" ? hexToBytes(signature) : signature;

        const request: PostOrderRequest = {
            order: quote.order,
            signature: signatureBytes,
            quoteId: quote.quoteId,
        };

        // WORKAROUND #34, #109: Adapt request for current OIF solver
        const adaptedRequest = adaptPostOrderRequest(request, quote);

        try {
            // Retry up to 3 times with 5s timeout per attempt
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

                    if (response.status !== 200) {
                        throw new ProviderExecuteFailure(
                            "Failed to submit order to solver",
                            `Unexpected status code: ${response.status}. SolverId: ${this.solverId}, QuoteId: ${request.quoteId}`,
                        );
                    }

                    return response.data;
                } catch (e) {
                    lastErr = e;
                    if (e instanceof AxiosError && e.response && e.response.status < 500) break;
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

    /**
     * Get the fill watcher configuration for OIF
     * Uses OIF API for tracking (not onchain events)
     *
     * @note EIP-7683 does NOT define a standard Fill event, so we use the solver's
     *       API endpoint for tracking: `GET /v1/orders/:orderId`
     * @see https://github.com/openintentsframework/oif-solver/issues/288 for known response divergences
     */
    static getFillWatcherConfig(baseUrl: string): APIBasedFillWatcherConfig<unknown> {
        return {
            type: "api-based",
            baseUrl,
            pollingInterval: 5000, // Poll every 5 seconds
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
                // Validate response against schema
                const validatedResponse = getOrderResponseSchema.parse(response);

                // WORKAROUND #111: Normalize status (handles object format from OIF solver)
                const status = adaptOrderStatus(validatedResponse.status);

                // Determine failure reason for failed orders
                let failureReason: OrderFailureReason | undefined;
                if (status === OrderStatus.Failed) {
                    // OIF doesn't provide specific failure reasons in the API
                    // Default to Unknown for now
                    failureReason = OrderFailureReason.Unknown;
                }

                // fillTxHash appears from executing onwards, but only finalized is terminal.
                // Matches oif-aggregator: poll until finalized.
                const isFinalized = status === OrderStatus.Finalized;

                // fillTxHash may be top-level or nested in fillTransaction.hash
                const fillTxHash = (validatedResponse.fillTxHash ??
                    validatedResponse.fillTransaction?.hash) as Hex | undefined;

                if (!isFinalized || !fillTxHash) {
                    return {
                        event: null,
                        status,
                        failureReason,
                        fillTxHash,
                    };
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

                // For OIF-compliant APIs, all data is in the typed response
                // No separate metadata needed
                return { event, status, failureReason };
            },
        };
    }

    /**
     * @inheritdoc
     *
     * Intent tracking for OIF providers:
     *
     * **Open event parsing**: ✅ Fully supported via OIFOpenedIntentParser.
     *
     * **Fill watching**: ✅ Supported via OIF API tracking endpoint.
     * Uses `GET /v1/orders/:orderId` to track fill status.
     *
     * @note EIP-7683 does NOT define a standard Fill event, so onchain tracking is not possible.
     *       We use the solver's API endpoint instead.
     */
    getTrackingConfig(): {
        openedIntentParserConfig: OpenedIntentParserConfig;
        fillWatcherConfig: FillWatcherConfig;
    } {
        return {
            // Use standard OIF Open event parsing (EIP-7683)
            openedIntentParserConfig: { type: "oif" },
            // Use API-based fill tracking via solver endpoint
            fillWatcherConfig: OifProvider.getFillWatcherConfig(this.url),
        };
    }

    /**
     * Get the configuration for asset discovery
     *
     * OIF providers use the standard OIF asset discovery API (GET /api/tokens)
     * as defined in OIF Spec PR 31.
     *
     * @see https://github.com/openintentsframework/oif-specs/pull/31
     *
     * @returns OIF asset discovery configuration with base URL
     */
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
