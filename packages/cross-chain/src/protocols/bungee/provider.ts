import type { AxiosInstance } from "axios";
import type { Hex } from "viem";
import axios from "axios";
import { ZodError } from "zod";

import type { SubmissionMode } from "../../core/schemas/providerConfig.js";
import type {
    AssetDiscoveryConfig,
    FillWatcherConfig,
    OpenedIntentParserConfig,
    Quote,
    QuoteRequest,
    SubmitOrderResponse,
} from "../../internal.js";
import type { BungeeQuoteOptions } from "./adapters/quoteRequestAdapter.js";
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
import { BUNGEE_API_URLS } from "./constants.js";
import { BungeeApiService } from "./services/index.js";
import { BungeeApiTier, BungeeConfigSchema } from "./types.js";

const DEFAULT_SUBMISSION_MODES: SubmissionMode[] = ["user-transaction"];

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
    private readonly quoteOptions: BungeeQuoteOptions;
    private readonly submissionModes: SubmissionMode[];

    constructor(config: BungeeConfigs = {}) {
        super();

        try {
            const parsed = BungeeConfigSchema.parse(config);
            this.baseUrl = parsed.baseUrl ?? BUNGEE_API_URLS[parsed.tier ?? BungeeApiTier.Sandbox];
            this.providerId = parsed.providerId ?? "bungee";

            this.apiHeaders = {};
            if (parsed.apiKey) {
                this.apiHeaders["x-api-key"] = parsed.apiKey;
            }
            if (parsed.affiliateId) {
                this.apiHeaders["affiliate"] = parsed.affiliateId;
            }

            this.submissionModes = parsed.submissionModes ?? DEFAULT_SUBMISSION_MODES;

            this.quoteOptions = {
                feeBps: parsed.feeBps,
                feeTakerAddress: parsed.feeTakerAddress,
                slippage: parsed.slippage,
                refuel: parsed.refuel,
            };

            this.http = axios.create({
                baseURL: this.baseUrl,
                headers: this.apiHeaders,
                timeout: 15_000,
            });
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
     * Fetches quotes for each configured submission mode in parallel
     * and returns the combined results. If a mode fails but others succeed,
     * the successful quotes are still returned.
     */
    async getQuotes(params: QuoteRequest): Promise<Quote[]> {
        const results = await Promise.allSettled(
            this.submissionModes.map((mode) => this.fetchQuotesForMode(params, mode)),
        );

        return this.collectQuotes(results);
    }

    /**
     * @inheritdoc
     *
     * Submits a signed order to Bungee.
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
                    headers: Object.keys(this.apiHeaders).length > 0 ? this.apiHeaders : undefined,
                    buildUrl: (txHash: Hex, _chainId: number): string =>
                        `${this.baseUrl}/api/v1/bungee/status?requestHash=${txHash}`,
                    extractOpenedIntent,
                },
            },
            fillWatcherConfig: {
                type: "api-based",
                baseUrl: this.baseUrl,
                headers: Object.keys(this.apiHeaders).length > 0 ? this.apiHeaders : undefined,
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

    /**
     * Collect quotes from settled results.
     *
     * Behavior:
     * - If any mode produced at least one quote, returns all fulfilled quotes
     *   (partial failures are tolerated when routes were found).
     * - If no quotes were produced and any mode threw, surfaces that API
     *   error so upstream callers see 4xx/5xx/validation failures.
     * - If every mode responded successfully with zero routes, returns `[]`
     *   so empty responses are treated as "no routes" rather than an error.
     */
    private collectQuotes(results: PromiseSettledResult<Quote[]>[]): Quote[] {
        const fulfilled = results.filter(
            (r): r is PromiseFulfilledResult<Quote[]> => r.status === "fulfilled",
        );
        const quotes = fulfilled.flatMap((r) => r.value);

        if (quotes.length > 0) return quotes;

        const firstError = results.find((r): r is PromiseRejectedResult => r.status === "rejected");
        if (firstError) throw firstError.reason as Error;

        return [];
    }

    /** Fetch quotes for a single submission mode. */
    private async fetchQuotesForMode(params: QuoteRequest, mode: SubmissionMode): Promise<Quote[]> {
        try {
            const options: BungeeQuoteOptions = { ...this.quoteOptions, submissionMode: mode };
            const bungeeParams = adaptQuoteRequest(params, options);
            const response = await this.apiService.getQuote(bungeeParams);
            return adaptQuotes(response, this.providerId);
        } catch (error) {
            if (error instanceof ProviderGetQuoteFailure) {
                throw error;
            }
            throw new ProviderGetQuoteFailure(
                `Failed to get Bungee quote for mode "${mode}"`,
                error instanceof Error ? error.message : String(error),
                error instanceof Error ? error.stack : undefined,
            );
        }
    }
}
