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
    LifiIntentsRoutesResponseSchema,
} from "./schemas.js";

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

            if (response.status < 200 || response.status >= 300) {
                throw new ProviderGetQuoteFailure(
                    "Failed to get LI.FI Intents quotes",
                    `Unexpected status: ${response.status}. URL: ${this.orderServerUrl}${LifiIntentsProvider.QUOTE_PATH}`,
                );
            }

            const { quotes } = LifiIntentsQuoteResponseSchema.parse(response.data);

            return quotes
                .filter((q) => q.order !== null)
                .map((q) => adaptQuoteResponse(q, this.providerId));
        } catch (error) {
            if (error instanceof ProviderGetQuoteFailure) throw error;
            if (error instanceof AxiosError) {
                const errorData = error.response?.data as { message?: string };
                const detail =
                    errorData?.message ||
                    (error.cause as Error | undefined)?.message ||
                    error.message ||
                    "unknown error";
                throw new ProviderGetQuoteFailure(
                    `LI.FI Intents quote failed: ${detail}`,
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
                error instanceof Error ? error.stack : undefined,
            );
        }
    }

    // user-open orders are on-chain transactions. The order server detects them via the Open event.
    // Default CrossChainProvider.submitOrder (throws ProviderExecuteNotImplemented) is correct.

    static getFillWatcherConfig(
        orderServerUrl: string,
    ): APIBasedFillWatcherConfig<LifiIntentsOrderStatusResponse> {
        return {
            type: "api-based",
            baseUrl: orderServerUrl,
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
                } catch {
                    console.warn(
                        "[LifiIntentsProvider] Failed to parse order status response, returning Pending",
                    );
                    return { event: null, status: OrderStatus.Pending };
                }

                const entry =
                    validated.data.find((d) => d.meta.onChainOrderId === params.orderId) ??
                    validated.data[0];

                if (!entry) {
                    return { event: null, status: OrderStatus.Pending };
                }

                const status = adaptOrderStatus(entry.meta.orderStatus);

                let failureReason: OrderFailureReason | undefined;
                if (status === OrderStatus.Failed) {
                    failureReason = entry.meta.expiredAt
                        ? OrderFailureReason.DeadlineExceeded
                        : OrderFailureReason.Unknown;
                }

                const fillTxHash = entry.meta.orderDeliveredTxHash;
                if (status !== OrderStatus.Finalized || !fillTxHash) {
                    return { event: null, status, failureReason };
                }

                return {
                    event: {
                        fillTxHash: fillTxHash as Hex,
                        timestamp: entry.meta.settledAt
                            ? Math.floor(new Date(entry.meta.settledAt).getTime() / 1000)
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
            openedIntentParserConfig: { type: "oif" },
            fillWatcherConfig: LifiIntentsProvider.getFillWatcherConfig(
                this.orderServerUrl,
            ) as FillWatcherConfig,
        };
    }

    override getDiscoveryConfig(): CustomApiAssetDiscoveryConfig {
        return {
            type: "custom-api",
            config: {
                assetsEndpoint: `${this.orderServerUrl}/routes`,
                parseResponse: LifiIntentsProvider.parseRoutesResponse,
            },
        };
    }

    private static parseRoutesResponse(data: unknown): NetworkAssets[] {
        const { routes } = LifiIntentsRoutesResponseSchema.parse(data);
        const chainAssetMap = new Map<
            number,
            Map<string, { address: string; symbol: string; decimals: number }>
        >();

        for (const route of routes) {
            const fromChainId = Number(route.fromChain.chainId);
            const toChainId = Number(route.toChain.chainId);
            addToChainAssetMap(chainAssetMap, fromChainId, route.fromToken);
            addToChainAssetMap(chainAssetMap, toChainId, route.toToken);
        }

        return Array.from(chainAssetMap.entries()).map(([chainId, assets]) => ({
            chainId,
            assets: Array.from(assets.values()),
        }));
    }
}

function addToChainAssetMap(
    map: Map<number, Map<string, { address: string; symbol: string; decimals: number }>>,
    chainId: number,
    token: { address: string; symbol: string | null; name: string | null; decimals: number },
): void {
    if (!map.has(chainId)) {
        map.set(chainId, new Map());
    }
    const key = token.address.toLowerCase();
    if (!map.get(chainId)!.has(key)) {
        map.get(chainId)!.set(key, {
            address: token.address,
            symbol: token.symbol ?? "",
            decimals: token.decimals,
        });
    }
}
