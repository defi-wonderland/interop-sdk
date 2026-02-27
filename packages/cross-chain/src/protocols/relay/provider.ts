import axios, { AxiosError } from "axios";
import { Address, Hex } from "viem";
import { ZodError } from "zod";

import type { TransactionStep } from "../../core/types/order.js";
import type { Quote } from "../../core/types/quote.js";
import type { QuoteRequest } from "../../core/types/quoteRequest.js";
import {
    APIBasedFillWatcherConfig,
    CrossChainProvider,
    FillEvent,
    FillWatcherConfig,
    GetFillParams,
    OpenedIntentParserConfig,
    OrderFailureReason,
    OrderStatus,
    ProviderConfigFailure,
    ProviderGetQuoteFailure,
} from "../../internal.js";
import { getRelayApiUrl } from "./constants.js";
import { RelayConfigs, RelayQuoteResponse, RelayStep } from "./interfaces.js";
import { RelayConfigSchema, RelayQuoteResponseSchema } from "./schemas.js";
import { RelayIntentStatusResponse, RelayMetadata } from "./types.js";

/**
 * An implementation of the CrossChainProvider interface for the Relay protocol.
 *
 * Relay is a cross-chain bridge/swap protocol with a REST API.
 * Relay supports both transaction-based and signature-based flows,
 * but this integration only handles transaction-based intents for now.
 * A quote can return multi-step flows (e.g. approve + deposit).
 *
 * @see https://docs.relay.link/
 */
export class RelayProvider extends CrossChainProvider {
    static readonly PROTOCOL_NAME = "relay" as const;

    readonly protocolName = RelayProvider.PROTOCOL_NAME;
    readonly providerId: string;
    private readonly apiUrl: string;
    private readonly apiKey?: string;
    private readonly source?: string;
    private readonly isTestnet: boolean;

    constructor(config: RelayConfigs) {
        super();

        try {
            const configParsed = RelayConfigSchema.parse(config);
            this.isTestnet = configParsed.isTestnet ?? false;
            this.apiUrl = configParsed.apiUrl || getRelayApiUrl(this.isTestnet);
            this.apiKey = configParsed.apiKey;
            this.source = configParsed.source;
            this.providerId = configParsed.providerId;
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
     * Build HTTP headers for Relay API requests
     */
    private buildHeaders(): Record<string, string> {
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        };
        if (this.apiKey) {
            headers["Authorization"] = `Bearer ${this.apiKey}`;
        }
        if (this.source) {
            headers["x-relay-source"] = this.source;
        }
        return headers;
    }

    /**
     * Get a quote from the Relay API
     */
    private async getRelayQuote(body: Record<string, unknown>): Promise<RelayQuoteResponse> {
        try {
            const response = await axios.post(`${this.apiUrl}/quote/v2`, body, {
                headers: this.buildHeaders(),
            });

            if (response.status !== 200) {
                throw new ProviderGetQuoteFailure("Failed to get Relay quote");
            }

            return RelayQuoteResponseSchema.parse(response.data);
        } catch (error) {
            if (error instanceof AxiosError) {
                const errorData = error.response?.data as { message?: string } | undefined;

                const message =
                    errorData?.message ||
                    (error.cause as Error | undefined)?.message ||
                    error.message ||
                    "Failed to get Relay quote";

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
            if (error instanceof ProviderGetQuoteFailure) {
                throw error;
            }
            throw new ProviderGetQuoteFailure(
                "Failed to get Relay quote",
                String(error),
                error instanceof Error ? error.stack : undefined,
            );
        }
    }

    /**
     * Extract the requestId from the Relay response steps.
     * Typically found on the deposit (last) step.
     */
    private static extractRequestId(steps: RelayStep[]): string | undefined {
        // Walk backwards — the deposit step usually has the requestId
        for (let i = steps.length - 1; i >= 0; i--) {
            if (steps[i]!.requestId) {
                return steps[i]!.requestId;
            }
        }
        return undefined;
    }

    /**
     * @inheritdoc
     */
    async getQuotes(params: QuoteRequest): Promise<Quote[]> {
        try {
            // Read SDK types directly — same pattern as AcrossProvider
            const input = params.intent.inputs[0]!;
            const output = params.intent.outputs[0]!;
            const recipient = output.recipient ?? {
                chainId: output.asset.chainId,
                address: params.user.address,
            };

            const swapType = params.intent.swapType || "exact-input";

            if (swapType === "exact-output" && !output.amount) {
                throw new ProviderGetQuoteFailure(
                    "exact-output swap requires output.amount to be specified",
                );
            }
            if (swapType === "exact-input" && !input.amount) {
                throw new ProviderGetQuoteFailure(
                    "exact-input swap requires input.amount to be specified",
                );
            }

            // Build Relay API request body
            const body: Record<string, unknown> = {
                user: params.user.address,
                originChainId: input.asset.chainId,
                destinationChainId: output.asset.chainId,
                originCurrency: input.asset.address,
                destinationCurrency: output.asset.address,
                amount: swapType === "exact-output" ? output.amount! : input.amount!,
                tradeType: swapType === "exact-output" ? "EXACT_OUTPUT" : "EXACT_INPUT",
            };

            // Only include recipient if different from user
            if (recipient.address !== params.user.address) {
                body.recipient = recipient.address;
            }

            const relayResponse = await this.getRelayQuote(body);

            // We only integrate transaction-based steps for now.
            // Relay also supports signature steps (e.g. permits),
            // which could be mapped to SDK SignatureSteps in a future iteration.
            // If any step is non-transaction, skip this quote entirely.
            const hasUnsupportedSteps = relayResponse.steps.some(
                (relayStep) => relayStep.kind !== "transaction",
            );
            if (hasUnsupportedSteps) {
                return [];
            }

            const steps: TransactionStep[] = relayResponse.steps.flatMap((relayStep) =>
                relayStep.items
                    .filter((item) => item.status === "incomplete")
                    .map(
                        (item): TransactionStep => ({
                            kind: "transaction" as const,
                            chainId: item.data.chainId,
                            description: relayStep.id,
                            transaction: {
                                to: item.data.to as string,
                                data: item.data.data,
                                ...(item.data.value && { value: item.data.value }),
                                ...(item.data.maxFeePerGas && {
                                    maxFeePerGas: item.data.maxFeePerGas,
                                }),
                                ...(item.data.maxPriorityFeePerGas && {
                                    maxPriorityFeePerGas: item.data.maxPriorityFeePerGas,
                                }),
                            },
                        }),
                    ),
            );

            const requestId = RelayProvider.extractRequestId(relayResponse.steps);

            // Build preview from details (with request params as fallback)
            const inputAmount =
                relayResponse.details?.currencyIn?.amount ??
                (swapType === "exact-input" ? input.amount! : (input.amount ?? "0"));
            const outputAmount =
                relayResponse.details?.currencyOut?.amount ??
                (swapType === "exact-output" ? output.amount! : (output.amount ?? "0"));

            const quote: Quote = {
                order: {
                    steps,
                    metadata: {
                        requestId,
                    },
                },
                preview: {
                    inputs: [
                        {
                            account: {
                                chainId: input.asset.chainId,
                                address: params.user.address,
                            },
                            asset: {
                                chainId: input.asset.chainId,
                                address: input.asset.address,
                            },
                            amount: inputAmount,
                        },
                    ],
                    outputs: [
                        {
                            account: recipient,
                            asset: {
                                chainId: output.asset.chainId,
                                address: output.asset.address,
                            },
                            amount: outputAmount,
                        },
                    ],
                },
                provider: this.providerId,
                quoteId: requestId,
                eta: relayResponse.details?.timeEstimate,
                partialFill: false,
                failureHandling: "refund-automatic",
                metadata: {
                    requestId,
                    relayFees: relayResponse.fees,
                },
            };

            return [quote];
        } catch (error) {
            if (error instanceof ZodError) {
                throw new ProviderGetQuoteFailure(
                    "Failed to parse Relay quote request",
                    error.message,
                    error.stack,
                );
            }
            if (error instanceof ProviderGetQuoteFailure) {
                throw error;
            }
            throw new ProviderGetQuoteFailure(
                "Failed to get Relay quotes",
                String(error),
                error instanceof Error ? error.stack : undefined,
            );
        }
    }

    /**
     * Get API-based fill watcher config for Relay
     * Uses Relay API to track intent status via requestId
     *
     * @see https://docs.relay.link/references/api/get-intent-status-v2
     */
    static getFillWatcherConfigAPI(
        apiUrl: string,
        apiKey?: string,
        source?: string,
    ): APIBasedFillWatcherConfig<RelayIntentStatusResponse, RelayMetadata> {
        const headers: Record<string, string> = {};
        if (apiKey) {
            headers["Authorization"] = `Bearer ${apiKey}`;
        }
        if (source) {
            headers["x-relay-source"] = source;
        }

        return {
            type: "api-based",
            baseUrl: apiUrl,
            ...(apiKey && { apiKey }),
            ...(Object.keys(headers).length > 0 && { headers }),
            pollingInterval: 5000,
            retry: {
                maxAttempts: 3,
                initialDelay: 2000,
                maxDelay: 15000,
                backoffMultiplier: 2,
            },
            buildEndpoint: (params: GetFillParams): string => {
                // Relay tracks by requestId, passed as orderId
                return `/intents/status/v3?requestId=${params.orderId}`;
            },
            extractFillEvent: (
                response: RelayIntentStatusResponse,
                params: GetFillParams,
            ): {
                event: FillEvent | null;
                status: OrderStatus;
                failureReason?: OrderFailureReason;
                metadata?: RelayMetadata;
            } => {
                let status: OrderStatus;
                let failureReason: OrderFailureReason | undefined;

                switch (response.status) {
                    case "success":
                        status = OrderStatus.Finalized;
                        break;
                    case "failure":
                        status = OrderStatus.Failed;
                        failureReason = OrderFailureReason.Unknown;
                        break;
                    case "refunded":
                    case "refund":
                        status = OrderStatus.Refunded;
                        break;
                    case "waiting":
                    case "pending":
                    case "submitted":
                    case "delayed":
                    default:
                        status = OrderStatus.Pending;
                        break;
                }

                const metadata: RelayMetadata = {
                    requestId: params.orderId,
                    inTxHashes: response.inTxHashes,
                    txHashes: response.txHashes,
                };

                // Only extract fill event when status is "success" and we have destination tx hashes
                if (response.status !== "success" || !response.txHashes?.length) {
                    return { event: null, status, failureReason, metadata };
                }

                const event: FillEvent = {
                    fillTxHash: response.txHashes[0] as Hex,
                    blockNumber: 0n,
                    timestamp: 0,
                    originChainId: params.originChainId,
                    orderId: params.orderId,
                    relayer: "0x0000000000000000000000000000000000000000" as Address,
                    recipient: "0x0000000000000000000000000000000000000000" as Address,
                };

                return { event, status, failureReason, metadata };
            },
        };
    }

    /**
     * @inheritdoc
     *
     * Relay tracks orders by requestId via its REST API.
     * The opened intent parser is a stub because Relay uses requestId-based
     * tracking (watchOrderByOrderId path) rather than on-chain event parsing.
     */
    getTrackingConfig(): {
        openedIntentParserConfig: OpenedIntentParserConfig;
        fillWatcherConfig: FillWatcherConfig;
    } {
        return {
            openedIntentParserConfig: {
                type: "custom-event",
                config: {
                    protocolName: RelayProvider.PROTOCOL_NAME,
                    // Stub event signature — Relay uses requestId-based tracking,
                    // not on-chain event parsing. The watchOrderByOrderId path
                    // skips the parser entirely.
                    eventSignature:
                        "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex,
                    extractOpenedIntent: (): never => {
                        throw new Error(
                            "Relay does not support on-chain event parsing. " +
                                "Use watchOrder({ orderId: requestId, ... }) instead.",
                        );
                    },
                },
            },
            fillWatcherConfig: RelayProvider.getFillWatcherConfigAPI(
                this.apiUrl,
                this.apiKey,
                this.source,
            ) as FillWatcherConfig,
        };
    }
}
