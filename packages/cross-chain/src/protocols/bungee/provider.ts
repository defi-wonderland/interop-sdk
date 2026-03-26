import type { AxiosInstance } from "axios";
import type { Hex } from "viem";
import axios from "axios";
import { ZodError } from "zod";

import type {
    AssetDiscoveryConfig,
    FillWatcherConfig,
    OpenedIntentParserConfig,
    Quote,
    QuoteRequest,
    SubmitOrderResponse,
} from "../../internal.js";
import type { BungeeConfigs } from "./types.js";
import {
    CrossChainProvider,
    ProviderConfigFailure,
    ProviderExecuteFailure,
    ProviderGetQuoteFailure,
} from "../../internal.js";
import {
    adaptQuoteRequest,
    adaptQuotes,
    adaptSubmitResponse,
    buildSubmitRequest,
    extractFillEvent,
    extractOpenedIntent,
    parseBungeeTokenListResponse,
} from "./adapters/index.js";
import { BUNGEE_API_URL } from "./constants.js";
import { BungeeApiService } from "./services/index.js";
import { BungeeConfigSchema } from "./types.js";

/**
 * A {@link CrossChainProvider} implementation for the Bungee protocol.
 *
 * @see https://docs.bungee.exchange/
 */
export class BungeeProvider extends CrossChainProvider {
    static readonly PROTOCOL_NAME = "bungee" as const;

    readonly protocolName = BungeeProvider.PROTOCOL_NAME;
    readonly providerId: string;
    private readonly http: AxiosInstance;
    private readonly baseUrl: string;
    private readonly apiService: BungeeApiService;
    private readonly apiHeaders: Record<string, string>;

    constructor(config: BungeeConfigs = {}) {
        super();

        try {
            const parsed = BungeeConfigSchema.parse(config);
            this.baseUrl = parsed.baseUrl ?? BUNGEE_API_URL;
            this.providerId = parsed.providerId ?? "bungee";

            this.apiHeaders = {};
            if (parsed.apiKey) {
                this.apiHeaders["x-api-key"] = parsed.apiKey;
            }
            this.http = axios.create({ baseURL: this.baseUrl, headers: this.apiHeaders });
            this.apiService = new BungeeApiService(this.http);
        } catch (error) {
            if (error instanceof ZodError) {
                throw new ProviderConfigFailure(
                    "Failed to parse Bungee config",
                    error.message,
                    error.stack,
                );
            }
            throw new ProviderConfigFailure(
                "Failed to configure Bungee provider",
                String(error),
                error instanceof Error ? error.stack : undefined,
            );
        }
    }

    /**
     * @inheritdoc
     *
     * Returns quotes from auto routes. The recommended route is first.
     */
    async getQuotes(params: QuoteRequest): Promise<Quote[]> {
        try {
            const bungeeParams = adaptQuoteRequest(params);
            const response = await this.apiService.getQuote(bungeeParams);

            return adaptQuotes(response, this.providerId);
        } catch (error) {
            if (error instanceof ProviderGetQuoteFailure) {
                throw error;
            }
            throw new ProviderGetQuoteFailure(
                "Failed to get Bungee quote",
                error instanceof Error ? error.message : String(error),
                error instanceof Error ? error.stack : undefined,
            );
        }
    }

    /**
     * @inheritdoc
     *
     * Submits a signed permit2 order to Bungee.
     */
    override async submitOrder(quote: Quote, signature: Hex): Promise<SubmitOrderResponse> {
        try {
            const { request, autoRoute } = buildSubmitRequest(quote, signature);
            const response = await this.apiService.submitOrder(request);
            return adaptSubmitResponse(response, autoRoute);
        } catch (error) {
            if (error instanceof ProviderExecuteFailure) {
                throw error;
            }
            throw new ProviderExecuteFailure(
                "Failed to submit Bungee order",
                error instanceof Error ? error.message : String(error),
                error instanceof Error ? error.stack : undefined,
            );
        }
    }

    /**
     * @inheritdoc
     * Returns API-based tracking config using Bungee `/api/v1/bungee/status`.
     */
    getTrackingConfig(): {
        openedIntentParserConfig: OpenedIntentParserConfig;
        fillWatcherConfig: FillWatcherConfig;
    } {
        return {
            openedIntentParserConfig: {
                type: "api",
                config: {
                    protocolName: BungeeProvider.PROTOCOL_NAME,
                    buildUrl: (txHash: Hex, _chainId: number): string =>
                        `${this.baseUrl}/api/v1/bungee/status?requestHash=${txHash}`,
                    extractOpenedIntent,
                },
            },
            fillWatcherConfig: {
                type: "api-based",
                baseUrl: this.baseUrl,
                pollingInterval: 5000,
                retry: {
                    maxAttempts: 3,
                    initialDelay: 2000,
                    maxDelay: 15000,
                    backoffMultiplier: 2,
                },
                buildEndpoint: (params): string =>
                    `/api/v1/bungee/status?requestHash=${params.orderId}`,
                extractFillEvent,
            } as FillWatcherConfig,
        };
    }

    /**
     * @inheritdoc
     * Returns API-based discovery config using Bungee `/api/v1/tokens/list`.
     */
    override getDiscoveryConfig(): AssetDiscoveryConfig {
        return {
            type: "custom-api",
            config: {
                assetsEndpoint: `${this.baseUrl}/api/v1/tokens/list?list=trending`,
                parseResponse: parseBungeeTokenListResponse,
                headers: Object.keys(this.apiHeaders).length > 0 ? this.apiHeaders : undefined,
            },
        };
    }
}
