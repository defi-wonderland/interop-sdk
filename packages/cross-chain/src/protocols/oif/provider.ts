import {
    GetQuoteResponse,
    Order as OifOrder,
    PostOrderRequest,
    PostOrderResponse,
} from "@openintentsframework/oif-specs";
import { encodeFunctionData, Hex, hexToBytes } from "viem";
import { ZodError } from "zod";

import type {
    ProviderExecutableQuote,
    ProviderQuote,
} from "../../core/interfaces/quotes.interface.js";
import type { Quote, SubmitOrderResponse } from "../../core/schemas/quote.js";
import type { BuildQuoteRequest, QuoteRequest } from "../../core/schemas/quoteRequest.js";
import { addressToBytes32 } from "../../core/utils/addressHelpers.js";
import { isSignableOifOrder } from "../../core/utils/orderTypeHelpers.js";
import {
    APIBasedFillWatcherConfig,
    CrossChainProvider,
    EventBasedFillWatcherConfig,
    FillEvent,
    FillWatcherConfig,
    GetFillParams,
    getOrderResponseSchema,
    getQuoteResponseSchema,
    HttpError,
    httpRequest,
    isNativeAddress,
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
} from "../../internal.js";
import {
    adaptOrderStatus,
    adaptPostOrderRequest,
    adaptQuote,
    adaptQuoteRequest,
    adaptTypedDataPayload,
} from "./adapters/index.js";
import {
    OIF_BROADCASTER_ORACLE,
    OIF_INPUT_SETTLER_ESCROW_BY_CHAIN,
    OIF_OUTPUT_SETTLER_BY_CHAIN,
    OUTPUT_FILLED_EVENT_ABI,
    STANDARD_ORDER_OPEN_ABI,
} from "./constants.js";

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
            this.supportedLocks = configParsed.supportedLocks ?? ["oif-escrow"];
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

            const response = await httpRequest<GetQuoteResponse>(`${this.url}/v1/quotes`, {
                method: "POST",
                body: oifRequest,
                headers: {
                    "Content-Type": "application/json",
                    ...this.headers,
                },
                timeout: OifProvider.REQUEST_TIMEOUT_MS,
            });

            // Validate but use raw data (Zod reorders fields, breaks integrity checksum)
            getQuoteResponseSchema.parse(response.data);
            const { quotes } = response.data as GetQuoteResponse;

            // TODO (EFI-887): re-enable when resource-lock support lands.
            for (const quote of quotes) {
                if (quote.order.type === "oif-resource-lock-v0") {
                    throw new ProviderGetQuoteFailure(
                        "oif-resource-lock-v0 is not supported in this release",
                    );
                }
            }

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
                const sdkQuote = adaptQuote(pq, params);
                sdkQuote.metadata = {
                    ...sdkQuote.metadata,
                    _oifProviderQuote: pq,
                };
                return sdkQuote;
            });
        } catch (error) {
            if (error instanceof HttpError) {
                const errorData = error.data as { message?: string } | undefined;
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
                    const response = await httpRequest<PostOrderResponse>(`${this.url}/v1/orders`, {
                        method: "POST",
                        body: adaptedRequest,
                        headers: { "Content-Type": "application/json", ...this.headers },
                        timeout: OifProvider.SUBMIT_TIMEOUT_MS,
                    });

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
                    // Retry only on 5xx. Network/timeout errors (status 0) break out to avoid
                    // duplicate orders if the request reached the solver but the response did not.
                    if (!(e instanceof HttpError) || e.status < 500) break;
                }
            }
            throw lastErr;
        } catch (error) {
            if (error instanceof HttpError) {
                const errorData = error.data as { message?: string } | undefined;
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
     * @inheritdoc
     */
    override async buildQuote(params: BuildQuoteRequest): Promise<Quote> {
        if (isNativeAddress(params.input.assetAddress, "eip155")) {
            throw new ProviderExecuteNotImplemented(
                "OIF buildQuote does not support native-token inputs: open() is nonpayable",
            );
        }

        const escrowAddress = OIF_INPUT_SETTLER_ESCROW_BY_CHAIN[params.input.chainId];

        if (!escrowAddress) {
            throw new ProviderExecuteNotImplemented(
                `OIF has no input settler on chain ${params.input.chainId}`,
            );
        }

        const outputSettler = OIF_OUTPUT_SETTLER_BY_CHAIN[params.output.chainId];
        if (!outputSettler) {
            throw new ProviderExecuteNotImplemented(
                `OIF has no output settler on chain ${params.output.chainId}`,
            );
        }

        // Nonce only needs to be unique per user. Millisecond timestamp avoids collisions.
        const nonce = BigInt(Date.now());
        const recipient = params.output.recipient ?? params.user;

        const calldata = encodeFunctionData({
            abi: STANDARD_ORDER_OPEN_ABI,
            functionName: "open",
            args: [
                {
                    user: params.user as Hex,
                    nonce,
                    originChainId: BigInt(params.input.chainId),
                    expires: params.fillDeadline,
                    fillDeadline: params.fillDeadline,
                    inputOracle: OIF_BROADCASTER_ORACLE,
                    inputs: [[BigInt(params.input.assetAddress), BigInt(params.input.amount)]],
                    outputs: [
                        {
                            oracle: addressToBytes32(OIF_BROADCASTER_ORACLE),
                            settler: addressToBytes32(outputSettler),
                            chainId: BigInt(params.output.chainId),
                            token: addressToBytes32(params.output.assetAddress),
                            amount: BigInt(params.output.amount),
                            recipient: addressToBytes32(recipient),
                            callbackData: "0x" as Hex,
                            context: "0x" as Hex,
                        },
                    ],
                },
            ],
        });

        return {
            provider: this.providerId,
            order: {
                steps: [
                    {
                        kind: "transaction" as const,
                        chainId: params.input.chainId,
                        transaction: {
                            to: escrowAddress,
                            data: calldata,
                        },
                    },
                ],
                checks: {
                    allowances: [
                        {
                            chainId: params.input.chainId,
                            tokenAddress: params.input.assetAddress,
                            owner: params.user,
                            spender: escrowAddress,
                            required: params.input.amount,
                        },
                    ],
                },
            },
            preview: {
                inputs: [
                    {
                        chainId: params.input.chainId,
                        accountAddress: params.user,
                        assetAddress: params.input.assetAddress,
                        amount: params.input.amount,
                    },
                ],
                outputs: [
                    {
                        chainId: params.output.chainId,
                        accountAddress: recipient,
                        assetAddress: params.output.assetAddress,
                        amount: params.output.amount,
                    },
                ],
            },
            metadata: {
                buildQuote: true,
                fillDeadline: params.fillDeadline,
                escrowContractAddress: escrowAddress,
                nonce: nonce.toString(),
            },
        };
    }

    static getApiFillWatcherConfig(baseUrl: string): APIBasedFillWatcherConfig<unknown> {
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

                return {
                    event: {
                        fillTxHash,
                        timestamp:
                            validatedResponse.updatedAt ??
                            validatedResponse.createdAt ??
                            Math.floor(Date.now() / 1000),
                        originChainId: params.originChainId,
                        orderId: params.orderId,
                    },
                    status,
                    failureReason,
                };
            },
        };
    }

    static getOnChainFillWatcherConfig(): EventBasedFillWatcherConfig {
        return {
            type: "event-based",
            contractAddresses: OIF_OUTPUT_SETTLER_BY_CHAIN,
            eventAbi: OUTPUT_FILLED_EVENT_ABI,
            buildLogsArgs: (params: GetFillParams, contractAddress) => ({
                address: contractAddress,
                event: OUTPUT_FILLED_EVENT_ABI[0],
                args: { orderId: params.orderId },
            }),
            extractFillEvent: (log, params): FillEvent | null => {
                if (!log.transactionHash) return null;
                return {
                    fillTxHash: log.transactionHash,
                    timestamp: 0,
                    originChainId: params.originChainId,
                    orderId: params.orderId,
                };
            },
        };
    }

    getTrackingConfig(): {
        openedIntentParserConfig: OpenedIntentParserConfig;
        fillWatcherConfig: FillWatcherConfig;
        onChainFillWatcherConfig?: FillWatcherConfig;
    } {
        return {
            openedIntentParserConfig: { type: "oif" },
            fillWatcherConfig: OifProvider.getApiFillWatcherConfig(this.url),
            onChainFillWatcherConfig: OifProvider.getOnChainFillWatcherConfig(),
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
