import type { AxiosInstance } from "axios";
import type { Address, Hex } from "viem";
import { encodeAddress } from "@wonderland/interop-addresses";
import axios from "axios";
import { ZodError } from "zod";

import type {
    AssetDiscoveryConfig,
    AssetInfo,
    FillWatcherConfig,
    NetworkAssets,
    OnBeforeTracking,
    OpenedIntentParserConfig,
    Quote,
    QuoteRequest,
} from "../../internal.js";
import type { RelayCurrencyEntry } from "./schemas.js";
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
import { RelayCurrenciesResponseSchema } from "./schemas.js";
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
                "Failed to get Relay quote",
                error instanceof Error ? error.message : String(error),
                error instanceof Error ? error.stack : undefined,
            );
        }
    }

    /**
     * @inheritdoc
     * Returns API-based tracking config using Relay `/intents/status/v3`.
     *
     * @see https://docs.relay.link/references/api/get-intent-status
     */
    getTrackingConfig(): {
        openedIntentParserConfig: OpenedIntentParserConfig;
        fillWatcherConfig: FillWatcherConfig;
        onBeforeTracking: OnBeforeTracking;
    } {
        return {
            openedIntentParserConfig: {
                type: "api",
                config: {
                    protocolName: RelayProvider.PROTOCOL_NAME,
                    buildUrl: (txHash: Hex, _chainId: number): string =>
                        `${this.baseUrl}/intents/status/v3?requestId=${txHash}`,
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
                buildEndpoint: (params): string => `/intents/status/v3?requestId=${params.orderId}`,
                extractFillEvent,
            } as FillWatcherConfig,
            onBeforeTracking: async ({ txHash, originChainId }): Promise<void> => {
                await this.apiService.indexTransaction({
                    chainId: String(originChainId),
                    txHash,
                });
            },
        };
    }

    /**
     * @inheritdoc
     * Returns custom-api discovery config using Relay `POST /currencies/v2`.
     */
    override getDiscoveryConfig(): AssetDiscoveryConfig {
        return {
            type: "custom-api",
            config: {
                assetsEndpoint: `${this.baseUrl}/currencies/v2`,
                parseResponse: RelayProvider.parseCurrenciesResponse,
            },
        };
    }

    /** Parse the Relay `/currencies/v2` response into SDK `NetworkAssets[]`. */
    private static parseCurrenciesResponse(data: unknown): NetworkAssets[] {
        const currencies = RelayCurrenciesResponseSchema.parse(data);
        return RelayProvider.groupCurrenciesByChain(currencies);
    }

    /** Group flat currency entries by chainId, deduplicating by address. */
    private static groupCurrenciesByChain(currencies: RelayCurrencyEntry[]): NetworkAssets[] {
        const chainMap = new Map<number, Map<string, AssetInfo>>();

        for (const currency of currencies) {
            const encoded = encodeAddress(
                {
                    version: 1,
                    chainType: "eip155",
                    chainReference: currency.chainId.toString(),
                    address: currency.address as Address,
                },
                { format: "hex" },
            );

            const asset: AssetInfo = {
                address: encoded as Address,
                symbol: currency.symbol,
                decimals: currency.decimals,
            };

            if (!chainMap.has(currency.chainId)) {
                chainMap.set(currency.chainId, new Map());
            }

            const chainAssets = chainMap.get(currency.chainId)!;
            const normalizedAddress = currency.address.toLowerCase();
            if (!chainAssets.has(normalizedAddress)) {
                chainAssets.set(normalizedAddress, asset);
            }
        }

        return Array.from(chainMap.entries()).map(([chainId, assetsMap]) => ({
            chainId,
            assets: Array.from(assetsMap.values()),
        }));
    }
}
