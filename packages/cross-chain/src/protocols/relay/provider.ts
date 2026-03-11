import type { AxiosInstance } from "axios";
import type { Hex } from "viem";
import axios from "axios";
import { ZodError } from "zod";

import type {
    APIBasedFillWatcherConfig,
    FillWatcherConfig,
    OpenedIntentParserConfig,
    Quote,
    QuoteRequest,
    RelayIntentStatusResponse,
} from "../../internal.js";
import type { RelayConfigs } from "./types.js";
import {
    CrossChainProvider,
    ProviderConfigFailure,
    ProviderGetQuoteFailure,
} from "../../internal.js";
import {
    adaptQuote,
    adaptQuoteRequest,
    extractFillEvent,
    extractOpenedIntent,
} from "./adapters/index.js";
import { getRelayApiUrl } from "./constants.js";
import { RelayApiService } from "./services/index.js";
import { RelayConfigSchema } from "./types.js";

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
    private readonly isTestnet: boolean;
    private readonly apiService: RelayApiService;

    constructor(config: RelayConfigs = {}) {
        super();

        try {
            const parsed = RelayConfigSchema.parse(config);
            this.isTestnet = parsed.isTestnet ?? false;
            this.baseUrl = parsed.baseUrl ?? getRelayApiUrl(this.isTestnet);
            this.providerId = parsed.providerId ?? "relay";

            const headers: Record<string, string> = {};
            if (parsed.apiKey) {
                headers["x-api-key"] = parsed.apiKey;
            }
            this.http = axios.create({ baseURL: this.baseUrl, headers });
            this.apiService = new RelayApiService(this.http);
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
            const relayParams = adaptQuoteRequest(params);
            const response = await this.apiService.getQuote(relayParams);
            return [adaptQuote(params, response, this.providerId)];
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
     * @inheritdoc
     *
     * Notifies the Relay API of a deposit transaction for faster solver indexing.
     */
    override async notifyDeposit(txHash: Hex, chainId: number): Promise<void> {
        await this.apiService.indexTransaction({
            chainId: String(chainId),
            txHash,
        });
    }

    /**
     * Get API-based fill watcher config for Relay.
     * Uses the Relay `/intents/status/v3` endpoint to track order status.
     *
     * @see https://docs.relay.link/references/api/get-intent-status
     */
    static getFillWatcherConfig(
        baseUrl: string = getRelayApiUrl(),
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
            extractFillEvent,
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
                    extractOpenedIntent,
                },
            },
            fillWatcherConfig: RelayProvider.getFillWatcherConfig(
                this.baseUrl,
            ) as FillWatcherConfig,
        };
    }
}
