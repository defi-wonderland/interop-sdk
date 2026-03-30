import type { AxiosInstance } from "axios";
import type { Hex } from "viem";
import axios from "axios";
import { ZodError } from "zod";

import type {
    AssetDiscoveryConfig,
    FillWatcherConfig,
    OpenedIntentParserConfig,
    PreTrackerConfig,
    PreTrackerParams,
    Quote,
    QuoteRequest,
    SubmitOrderResponse,
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
    adaptSubmitRequest,
    adaptSubmitResponse,
    extractFillEvent,
    extractOpenedIntent,
    parseRelayChainsResponse,
} from "./adapters/index.js";
import { getRelayApiUrl, RELAY_TESTNET_TOKENS } from "./constants.js";
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
    private readonly submissionModes: ("user-transaction" | "gasless")[];
    private readonly apiService: RelayApiService;
    private readonly apiHeaders: Record<string, string>;

    constructor(config: RelayConfigs = {}) {
        super();

        try {
            const parsed = RelayConfigSchema.parse(config);
            this.isTestnet = parsed.isTestnet ?? false;
            this.submissionModes = parsed.submissionModes ?? ["user-transaction", "gasless"];
            this.baseUrl = parsed.baseUrl ?? getRelayApiUrl(this.isTestnet);
            this.providerId = parsed.providerId ?? "relay";

            this.apiHeaders = {};
            if (parsed.apiKey) {
                this.apiHeaders["x-api-key"] = parsed.apiKey;
            }
            this.http = axios.create({ baseURL: this.baseUrl, headers: this.apiHeaders });
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
     * Fetches quotes for each configured submission mode in parallel
     * and returns the combined results. If a mode fails but others succeed,
     * the successful quotes are still returned.
     */
    async getQuotes(params: QuoteRequest): Promise<Quote[]> {
        const results = await Promise.allSettled(
            this.submissionModes.map((mode) => this.fetchQuoteForMode(params, mode)),
        );

        return this.collectQuotes(results);
    }

    /**
     * @inheritdoc
     *
     * Submits a signed permit to Relay via `POST /execute/permits`.
     * Reads the permit body from the signature step's metadata (set during quote adaptation).
     */
    override async submitOrder(quote: Quote, signature: Hex): Promise<SubmitOrderResponse> {
        const permitBody = adaptSubmitRequest(quote);
        await this.apiService.submitPermit(permitBody, signature);

        return adaptSubmitResponse(quote);
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
        preTrackerConfig: PreTrackerConfig;
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
            preTrackerConfig: {
                type: "api" as const,
                protocolName: RelayProvider.PROTOCOL_NAME,
                buildUrl: (): string => `${this.baseUrl}/transactions/index`,
                buildBody: (params: PreTrackerParams): Record<string, unknown> => ({
                    chainId: String(params.originChainId),
                    txHash: params.txHash,
                    ...(params.orderId && { requestId: params.orderId }),
                }),
                headers: Object.keys(this.apiHeaders).length > 0 ? this.apiHeaders : undefined,
            },
        };
    }

    /**
     * @inheritdoc
     * Returns static discovery config for testnet, or API-based config for mainnet.
     */
    override getDiscoveryConfig(): AssetDiscoveryConfig {
        if (this.isTestnet) {
            return {
                type: "static",
                config: { networks: RELAY_TESTNET_TOKENS },
            };
        }

        return {
            type: "custom-api",
            config: {
                assetsEndpoint: `${this.baseUrl}/chains`,
                parseResponse: parseRelayChainsResponse,
                headers: Object.keys(this.apiHeaders).length > 0 ? this.apiHeaders : undefined,
            },
        };
    }

    /** Fetch a single quote for one submission mode. */
    private async fetchQuoteForMode(
        params: QuoteRequest,
        mode: "user-transaction" | "gasless",
    ): Promise<Quote> {
        const relayParams = adaptQuoteRequest(params, { submissionMode: mode });
        const response = await this.apiService.getQuote(relayParams);
        return adaptQuote(params, response, this.providerId);
    }

    /** Collect successful quotes. Re-throws the first error if all modes failed. */
    private collectQuotes(results: PromiseSettledResult<Quote>[]): Quote[] {
        const quotes = results
            .filter((r): r is PromiseFulfilledResult<Quote> => r.status === "fulfilled")
            .map((r) => r.value);

        if (quotes.length > 0) return quotes;

        const firstError = results.find((r): r is PromiseRejectedResult => r.status === "rejected");

        throw firstError?.reason ?? new ProviderGetQuoteFailure("No quotes returned");
    }
}
