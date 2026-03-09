import type { AxiosInstance } from "axios";
import type { Address, Hex } from "viem";
import axios, { AxiosError } from "axios";
import { zeroAddress } from "viem";
import { ZodError } from "zod";

import type {
    APIBasedFillWatcherConfig,
    FillEvent,
    FillWatcherConfig,
    OpenedIntent,
    OpenedIntentParserConfig,
    Quote,
    QuoteRequest,
    RelayIntentStatusResponse,
    Step,
} from "../../internal.js";
import type {
    RelayIntentStatusRequest,
    RelayQuoteRequest,
    RelayQuoteResponse,
    RelayQuoteStep,
} from "./schemas.js";
import type { RelayConfigs } from "./types.js";
import {
    CrossChainProvider,
    OpenedIntentNotFoundError,
    OrderFailureReason,
    OrderStatus,
    ProviderConfigFailure,
    ProviderGetQuoteFailure,
    ProviderGetStatusFailure,
} from "../../internal.js";
import {
    RelayBadRequestResponseSchema,
    RelayIntentStatusRequestSchema,
    RelayIntentStatusResponseSchema,
    RelayQuoteRequestSchema,
    RelayQuoteResponseSchema,
} from "./schemas.js";
import { RELAY_BASE_URL, RelayConfigSchema } from "./types.js";

/** Maps Relay intent status strings to SDK OrderStatus values. */
const RELAY_STATUS_MAP: Record<
    string,
    { status: OrderStatus; failureReason?: OrderFailureReason }
> = {
    waiting: { status: OrderStatus.Pending },
    pending: { status: OrderStatus.Executing },
    submitted: { status: OrderStatus.Settling },
    success: { status: OrderStatus.Finalized },
    failure: { status: OrderStatus.Failed, failureReason: OrderFailureReason.Unknown },
    refund: { status: OrderStatus.Refunded },
};

/**
 * A {@link CrossChainProvider} implementation for the Relay protocol.
 *
 * @see https://docs.relay.link/
 */
export class RelayProvider extends CrossChainProvider {
    static readonly PROTOCOL_NAME = "relay" as const;

    readonly protocolName = RelayProvider.PROTOCOL_NAME;
    readonly providerId: string;
    private readonly http: AxiosInstance;
    private readonly baseUrl: string;
    private readonly slippageTolerance?: number;

    constructor(config: RelayConfigs = {}) {
        super();

        try {
            const parsed = RelayConfigSchema.parse(config);
            this.baseUrl = parsed.baseUrl ?? RELAY_BASE_URL;
            this.providerId = parsed.providerId ?? "relay";
            this.slippageTolerance = parsed.slippageTolerance;

            const headers: Record<string, string> = {};
            if (parsed.apiKey) {
                headers["x-api-key"] = parsed.apiKey;
            }
            this.http = axios.create({ baseURL: this.baseUrl, headers });
        } catch (error) {
            if (error instanceof ZodError) {
                throw new ProviderConfigFailure(
                    "Failed to parse Relay config",
                    error.message,
                    error.stack,
                );
            }
            throw new ProviderConfigFailure(
                "Failed to configure Relay provider",
                String(error),
                error instanceof Error ? error.stack : undefined,
            );
        }
    }

    /**
     * @inheritdoc
     *
     * Builds SDK Quote types directly from Relay API response.
     */
    async getQuotes(params: QuoteRequest): Promise<Quote[]> {
        try {
            const relayParams = this.toRelayParams(params);
            const response = await this.getRelayQuote(relayParams);
            return [this.toSdkQuote(params, response)];
        } catch (error) {
            if (error instanceof ProviderGetQuoteFailure) {
                throw error;
            }
            throw new ProviderGetQuoteFailure(
                "Failed to get Relay quotes",
                error instanceof ZodError ? error.message : String(error),
                error instanceof Error ? error.stack : undefined,
            );
        }
    }

    /**
     * Check the status of a Relay intent via `/intents/status/v3`.
     */
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

    /**
     * Get API-based fill watcher config for Relay.
     * Uses the Relay `/intents/status/v3` endpoint to track order status.
     *
     * @see https://docs.relay.link/references/api/get-intent-status
     */
    static getFillWatcherConfig(
        baseUrl: string = RELAY_BASE_URL,
    ): APIBasedFillWatcherConfig<RelayIntentStatusResponse> {
        return {
            type: "api-based",
            baseUrl,
            pollingInterval: 5000,
            retry: {
                maxAttempts: 3,
                initialDelay: 2000,
                maxDelay: 15000,
                backoffMultiplier: 2,
            },
            buildEndpoint: (params): string => `/intents/status/v3?requestId=${params.orderId}`,
            extractFillEvent: (
                response,
                params,
            ): {
                event: FillEvent | null;
                status: OrderStatus;
                failureReason?: OrderFailureReason;
                fillTxHash?: string;
            } => {
                const { status, failureReason } = RELAY_STATUS_MAP[response.status] ?? {
                    status: OrderStatus.Pending,
                };
                const fillTxHash = response.txHashes?.[0];

                const isFilled = status === OrderStatus.Finalized && fillTxHash;
                const event: FillEvent | null = isFilled
                    ? {
                          fillTxHash: fillTxHash as Hex,
                          blockNumber: 0n,
                          timestamp: response.updatedAt ?? 0,
                          originChainId: params.originChainId,
                          orderId: params.orderId,
                          relayer: zeroAddress,
                          recipient: zeroAddress,
                      }
                    : null;

                return { event, status, failureReason, fillTxHash };
            },
        };
    }

    /**
     * @inheritdoc
     * Returns API-based tracking config using Relay `/intents/status/v3`.
     */
    getTrackingConfig(): {
        openedIntentParserConfig: OpenedIntentParserConfig;
        fillWatcherConfig: FillWatcherConfig;
    } {
        return {
            openedIntentParserConfig: {
                type: "api",
                config: {
                    protocolName: RelayProvider.PROTOCOL_NAME,
                    buildUrl: (txHash: Hex): string =>
                        `${this.baseUrl}/intents/status/v3?requestId=${txHash}`,
                    extractOpenedIntent: (response, txHash): OpenedIntent => {
                        const parsed = RelayIntentStatusResponseSchema.safeParse(response);

                        if (!parsed.success) {
                            throw new OpenedIntentNotFoundError(
                                txHash,
                                RelayProvider.PROTOCOL_NAME,
                            );
                        }

                        const data = parsed.data;
                        const originTxHash = (data.inTxHashes?.[0] as Hex) ?? txHash;

                        return {
                            user: zeroAddress as Address,
                            originChainId: data.originChainId ?? 0,
                            openDeadline: 0,
                            fillDeadline: 0,
                            orderId: txHash,
                            maxSpent: [],
                            minReceived: [],
                            fillInstructions: data.destinationChainId
                                ? [
                                      {
                                          destinationChainId: data.destinationChainId,
                                          destinationSettler: zeroAddress as Hex,
                                          originData: "0x" as Hex,
                                      },
                                  ]
                                : [],
                            txHash: originTxHash,
                            blockNumber: 0n,
                            originContract: zeroAddress as Address,
                        };
                    },
                },
            },
            fillWatcherConfig: RelayProvider.getFillWatcherConfig(
                this.baseUrl,
            ) as FillWatcherConfig,
        };
    }

    /**
     * Get a quote from the Relay API calling POST /quote/v2
     */
    private async getRelayQuote(params: RelayQuoteRequest): Promise<RelayQuoteResponse> {
        try {
            const response = await this.http.post("/quote/v2", params);
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

    /**
     * Convert SDK QuoteRequest to Relay API parameters.
     */
    private toRelayParams(params: QuoteRequest): RelayQuoteRequest {
        const swapType = params.swapType ?? "exact-input";
        const amount = swapType === "exact-input" ? params.input.amount : params.output.amount;

        if (!amount) {
            const side = swapType === "exact-input" ? "input" : "output";
            throw new ProviderGetQuoteFailure(`${swapType} requires ${side}.amount to be defined`);
        }

        return RelayQuoteRequestSchema.parse({
            user: params.user,
            originChainId: params.input.chainId,
            originCurrency: params.input.assetAddress,
            destinationChainId: params.output.chainId,
            destinationCurrency: params.output.assetAddress,
            amount,
            tradeType: swapType === "exact-input" ? "EXACT_INPUT" : "EXPECTED_OUTPUT",
            recipient: params.output.recipient,
            slippageTolerance:
                this.slippageTolerance !== undefined ? String(this.slippageTolerance) : undefined,
        });
    }

    /**
     * Build an SDK Quote directly from Relay API response.
     */
    private toSdkQuote(params: QuoteRequest, response: RelayQuoteResponse): Quote {
        const currencyIn = response.details?.currencyIn;
        const currencyOut = response.details?.currencyOut;

        return {
            order: {
                steps: response.steps.flatMap((step) => this.toSdkSteps(step)),
            },
            preview: {
                inputs: [
                    {
                        chainId: currencyIn?.currency.chainId ?? params.input.chainId,
                        accountAddress: params.user,
                        assetAddress: currencyIn?.currency.address ?? params.input.assetAddress,
                        amount: currencyIn?.amount ?? params.input.amount ?? "0",
                    },
                ],
                outputs: [
                    {
                        chainId: currencyOut?.currency.chainId ?? params.output.chainId,
                        accountAddress: params.output.recipient ?? params.user,
                        assetAddress: currencyOut?.currency.address ?? params.output.assetAddress,
                        amount: currencyOut?.amount ?? params.output.amount ?? "0",
                    },
                ],
            },
            quoteId: response.protocol?.v2?.orderId,
            eta: response.details?.timeEstimate,
            partialFill: false,
            failureHandling: "refund-automatic",
            provider: this.providerId,
            metadata: { relayResponse: response },
        };
    }

    /** Map a single Relay step to SDK Step entries (one per incomplete transaction item). */
    private toSdkSteps(step: RelayQuoteStep): Step[] {
        if (step.kind !== "transaction") {
            return [];
        }

        return step.items
            .filter((item) => item.status === "incomplete")
            .map((item) => ({
                kind: "transaction" as const,
                chainId: item.data.chainId,
                description: step.description,
                transaction: {
                    to: item.data.to,
                    data: item.data.data,
                    value: item.data.value,
                    ...(item.data.gas &&
                        item.data.gas !== "0" && {
                            gas: item.data.gas,
                        }),
                    ...(item.data.maxFeePerGas && {
                        maxFeePerGas: item.data.maxFeePerGas,
                    }),
                    ...(item.data.maxPriorityFeePerGas && {
                        maxPriorityFeePerGas: item.data.maxPriorityFeePerGas,
                    }),
                },
            }));
    }
}
