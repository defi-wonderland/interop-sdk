import axios, { AxiosError } from "axios";
import { Hex } from "viem";
import { ZodError } from "zod";

import type { Quote } from "../../core/schemas/quote.js";
import type { QuoteRequest } from "../../core/schemas/quoteRequest.js";
import type { NetworkAssets } from "../../core/types/assetDiscovery.js";
import type { FillEvent, GetFillParams } from "../../core/types/orderTracking.js";
import type { LifiIntentsProviderConfig } from "./LifiIntentsProvider.interface.js";
import type { LifiIntentsOrderStatusResponse, LifiIntentsQuoteResponse } from "./schemas.js";
import {
    APIBasedFillWatcherConfig,
    CrossChainProvider,
    CustomApiAssetDiscoveryConfig,
    FillWatcherConfig,
    isNativeAddress,
    OpenedIntentParserConfig,
    OrderFailureReason,
    OrderStatus,
    ProviderConfigFailure,
    ProviderGetQuoteFailure,
} from "../../internal.js";
import { adaptOrderStatus, adaptQuoteRequest, adaptQuoteResponse } from "./adapters/index.js";
import {
    LifiIntentsOrderStatusResponseSchema,
    LifiIntentsProviderConfigSchema,
    LifiIntentsQuoteResponseSchema,
} from "./schemas.js";
import { parseRoutesIntoAssets } from "./services/parseRoutes.js";

export class LifiIntentsProvider extends CrossChainProvider {
    static readonly PROTOCOL_NAME = "lifi-intents" as const;

    readonly protocolName = LifiIntentsProvider.PROTOCOL_NAME;
    readonly providerId: string;

    private readonly orderServerUrl: string;
    private readonly headers?: Record<string, string>;

    private static readonly REQUEST_TIMEOUT_MS = 30_000;
    private static readonly QUOTE_PATH = "/api/v1/integrator/quote/request";

    constructor(config: LifiIntentsProviderConfig) {
        super();

        try {
            const parsed = LifiIntentsProviderConfigSchema.parse(config);
            this.orderServerUrl = parsed.orderServerUrl;
            this.providerId = parsed.providerId ?? "lifi-intents";
            this.headers = parsed.headers;
        } catch (error) {
            if (error instanceof ZodError) {
                throw new ProviderConfigFailure(
                    "Failed to parse LI.FI Intents provider config",
                    error.message,
                    error.stack,
                );
            }
            throw new ProviderConfigFailure(
                "Failed to configure LI.FI Intents provider",
                String(error),
                error instanceof Error ? error.stack : undefined,
            );
        }
    }

    async getQuotes(params: QuoteRequest): Promise<Quote[]> {
        if (isNativeAddress(params.input.assetAddress, "eip155")) {
            return [];
        }

        try {
            const lifiRequest = adaptQuoteRequest(params);

            const response = await axios.post<LifiIntentsQuoteResponse>(
                `${this.orderServerUrl}${LifiIntentsProvider.QUOTE_PATH}`,
                lifiRequest,
                {
                    headers: { "Content-Type": "application/json", ...this.headers },
                    timeout: LifiIntentsProvider.REQUEST_TIMEOUT_MS,
                },
            );

            const { quotes } = LifiIntentsQuoteResponseSchema.parse(response.data);

            return quotes
                .filter((q) => q.order !== null)
                .map((q) => adaptQuoteResponse(q, this.providerId));
        } catch (error) {
            if (error instanceof ProviderGetQuoteFailure) throw error;
            if (error instanceof AxiosError) {
                throw new ProviderGetQuoteFailure(
                    `LI.FI Intents quote failed: ${error.message}`,
                    `URL: ${this.orderServerUrl}${LifiIntentsProvider.QUOTE_PATH}`,
                    error.stack,
                );
            }
            if (error instanceof ZodError) {
                throw new ProviderGetQuoteFailure(
                    `LI.FI Intents quote response validation failed: ${error.issues.map((i) => i.message).join(", ")}`,
                    error.message,
                    error.stack,
                );
            }
            throw new ProviderGetQuoteFailure(
                `LI.FI Intents quote failed: ${error instanceof Error ? error.message : String(error)}`,
                undefined,
                error instanceof Error ? error.stack : undefined,
            );
        }
    }

    // user-open orders are on-chain transactions. The order server detects them via the Open event.
    // Default CrossChainProvider.submitOrder (throws ProviderExecuteNotImplemented) is correct.

    static getFillWatcherConfig(
        orderServerUrl: string,
        headers?: Record<string, string>,
    ): APIBasedFillWatcherConfig<LifiIntentsOrderStatusResponse> {
        return {
            type: "api-based",
            baseUrl: orderServerUrl,
            headers,
            pollingInterval: 5_000,
            retry: {
                maxAttempts: 3,
                initialDelay: 1_000,
                maxDelay: 10_000,
                backoffMultiplier: 2,
            },
            buildEndpoint: (params: GetFillParams): string =>
                `/orders/status?onChainOrderId=${params.orderId}`,
            extractFillEvent: (
                response: LifiIntentsOrderStatusResponse,
                params: GetFillParams,
            ): {
                event: FillEvent | null;
                status: OrderStatus;
                failureReason?: OrderFailureReason;
            } => {
                let validated;
                try {
                    validated = LifiIntentsOrderStatusResponseSchema.parse(response);
                } catch (error) {
                    if (error instanceof ZodError) {
                        console.warn(
                            "[LifiIntentsProvider] Failed to parse order status response, returning Pending",
                        );
                        return { event: null, status: OrderStatus.Pending };
                    }
                    throw error;
                }

                const status = adaptOrderStatus(validated.meta.orderStatus);

                let failureReason: OrderFailureReason | undefined;
                if (status === OrderStatus.Failed) {
                    failureReason = validated.meta.expiredAt
                        ? OrderFailureReason.DeadlineExceeded
                        : OrderFailureReason.Unknown;
                }

                const fillTxHash = validated.meta.orderDeliveredTxHash;
                if (status !== OrderStatus.Finalized || !fillTxHash) {
                    return { event: null, status, failureReason };
                }

                return {
                    event: {
                        fillTxHash: fillTxHash as Hex,
                        timestamp: validated.meta.settledAt
                            ? Math.floor(new Date(validated.meta.settledAt).getTime() / 1000)
                            : Math.floor(Date.now() / 1000),
                        originChainId: params.originChainId,
                        orderId: params.orderId,
                    },
                    status,
                    failureReason,
                };
            },
        };
    }

    getTrackingConfig(): {
        openedIntentParserConfig: OpenedIntentParserConfig;
        fillWatcherConfig: FillWatcherConfig;
    } {
        return {
            openedIntentParserConfig: { type: "lifi-intents" },
            fillWatcherConfig: LifiIntentsProvider.getFillWatcherConfig(
                this.orderServerUrl,
                this.headers,
            ) as FillWatcherConfig,
        };
    }

    override getDiscoveryConfig(): CustomApiAssetDiscoveryConfig {
        return {
            type: "custom-api",
            config: {
                assetsEndpoint: `${this.orderServerUrl}/routes`,
                parseResponse: LifiIntentsProvider.parseRoutesResponse,
                headers: this.headers,
            },
        };
    }

    private static parseRoutesResponse(data: unknown): NetworkAssets[] {
        return parseRoutesIntoAssets(data);
    }
}
