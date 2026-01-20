import {
    GetQuoteRequest,
    GetQuoteResponse,
    PostOrderRequest,
    PostOrderResponse,
} from "@openintentsframework/oif-specs";
import axios, { AxiosError } from "axios";
import { bytesToHex, Hex, PrepareTransactionRequestReturnType } from "viem";
import { ZodError } from "zod";

import {
    APIBasedFillWatcherConfig,
    CrossChainProvider,
    ExecutableQuote,
    FillEvent,
    FillWatcherConfig,
    GetFillParams,
    getOrderResponseSchema,
    getQuoteResponseSchema,
    OifProviderConfig,
    OifProviderConfigSchema,
    OpenedIntentParserConfig,
    OrderFailureReason,
    OrderStatus,
    ProviderConfigFailure,
    ProviderExecuteFailure,
    ProviderExecuteNotImplemented,
    ProviderGetQuoteFailure,
    Quote,
} from "../internal.js";

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
    async getQuotes(params: GetQuoteRequest): Promise<ExecutableQuote[]> {
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

            const validatedResponse = getQuoteResponseSchema.parse(response.data);

            const executableQuotes: ExecutableQuote[] = validatedResponse.quotes.map(
                (quote): ExecutableQuote => {
                    const preparedTransaction = this.prepareTransaction(quote);

                    return {
                        ...quote,
                        provider: quote.provider ?? this.solverId,
                        metadata: {
                            ...quote.metadata,
                            ...(this.adapterMetadata && { adapterMetadata: this.adapterMetadata }),
                        },
                        preparedTransaction,
                    };
                },
            );

            return executableQuotes;
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
        if (quote.order.type !== "oif-escrow-v0") {
            throw new ProviderExecuteNotImplemented(
                `Execute not supported for order type: ${quote.order.type}`,
            );
        }

        const signatureBytes =
            typeof signature === "string"
                ? new Uint8Array(Buffer.from(signature.slice(2), "hex"))
                : signature;

        return this.submitOrderToSolver({
            order: quote.order,
            signature: signatureBytes,
            quoteId: quote.quoteId,
        });
    }

    /**
     * Submit a signed order to the solver
     * @param request - The post order request
     * @returns The post order response
     */
    private async submitOrderToSolver(request: PostOrderRequest): Promise<PostOrderResponse> {
        try {
            const response = await axios.post<PostOrderResponse>(`${this.url}/v1/orders`, request, {
                headers: {
                    "Content-Type": "application/json",
                    ...this.headers,
                },
                timeout: OifProvider.REQUEST_TIMEOUT_MS,
            });

            if (response.status !== 200) {
                throw new ProviderExecuteFailure(
                    "Failed to submit order to solver",
                    `Unexpected status code: ${response.status}. SolverId: ${this.solverId}, QuoteId: ${request.quoteId}`,
                );
            }

            return response.data;
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
            } => {
                // Validate response against schema
                const validatedResponse = getOrderResponseSchema.parse(response);

                // Map OIF API status string to OrderStatus enum
                const status = validatedResponse.status as OrderStatus;

                // Determine failure reason for failed orders
                let failureReason: OrderFailureReason | undefined;
                if (status === OrderStatus.Failed) {
                    // OIF doesn't provide specific failure reasons in the API
                    // Default to Unknown for now
                    failureReason = OrderFailureReason.Unknown;
                }

                // Only extract fill event if status indicates fill transaction exists
                // Order must be Finalized, Settled, or Executing to have a fillTxHash
                const hasFillTx =
                    status === OrderStatus.Finalized ||
                    status === OrderStatus.Settled ||
                    status === OrderStatus.Executing;

                if (!hasFillTx || !validatedResponse.fillTxHash) {
                    return { event: null, status, failureReason };
                }

                const fillTxHash = validatedResponse.fillTxHash as Hex;
                const blockNumber = 0n; // API doesn't provide block number

                // Extract solver/relayer - OIF doesn't provide solver address in status response
                // Use placeholder for now
                const relayer = "0x0000000000000000000000000000000000000000" as Hex;

                // Extract recipient from outputs (first output receiver)
                const recipient = "0x0000000000000000000000000000000000000000" as Hex;

                const event: FillEvent = {
                    fillTxHash,
                    blockNumber,
                    timestamp:
                        validatedResponse.executionDetails?.filledAt || validatedResponse.createdAt,
                    originChainId: params.originChainId,
                    orderId: params.orderId,
                    relayer,
                    recipient,
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
}
