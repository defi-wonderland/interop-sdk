import type { Hex } from "viem";
import { ZodError } from "zod";

import type { SubmissionMode } from "../../core/schemas/providerConfig.js";
import type {
    AssetDiscoveryConfig,
    FillWatcherConfig,
    GetOrderExplorersParams,
    HttpClient,
    OpenedIntentParserConfig,
    OrderExplorers,
    Quote,
    QuoteRequest,
    SubmitOrderResponse,
} from "../../internal.js";
import type { BungeeQuoteOptions } from "./adapters/quoteRequestAdapter.js";
import type { BungeeBuildTxResult, BungeeManualRoute, BungeeQuoteResponse } from "./schemas.js";
import type { BungeeConfigs } from "./types.js";
import {
    CrossChainProvider,
    FetchHttpClient,
    ProviderConfigFailure,
    ProviderExecuteFailure,
    ProviderGetQuoteFailure,
} from "../../internal.js";
import {
    adaptManualRouteQuote,
    adaptQuoteRequest,
    adaptQuotes,
    adaptSubmitResponse,
    buildSubmitRequest,
    extractFillEvent,
    extractOpenedIntent,
    parseBungeeTokenListResponse,
} from "./adapters/index.js";
import { BUNGEE_API_URLS, BUNGEE_EXPLORER_BASE_URL } from "./constants.js";
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
    private readonly http: HttpClient;
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
                enableOtherProviders: parsed.enableOtherProviders,
                enableMultipleRoutes: parsed.enableMultipleRoutes,
            };

            this.http = new FetchHttpClient({
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
     *
     * Two API-based fill watchers so each flow polls Bungee with the right identifier:
     * - `fillWatcherConfig` (auto routes) → `?requestHash=` using `tracking.orderId`.
     * - `onChainFillWatcherConfig` (manual routes) → `?txHash=` using the on-chain `openTxHash`.
     */
    getTrackingConfig(): {
        openedIntentParserConfig: OpenedIntentParserConfig;
        fillWatcherConfig: FillWatcherConfig;
        onChainFillWatcherConfig: FillWatcherConfig;
    } {
        const headers = Object.keys(this.apiHeaders).length > 0 ? this.apiHeaders : undefined;
        const fillWatcherBase = {
            type: "api-based" as const,
            baseUrl: this.baseUrl,
            headers,
            pollingInterval: 5000,
            retry: {
                maxAttempts: 3,
                initialDelay: 2000,
                maxDelay: 15000,
                backoffMultiplier: 2,
            },
            extractFillEvent,
        };

        return {
            openedIntentParserConfig: {
                type: "api",
                config: {
                    protocolName: BungeeProvider.PROTOCOL_NAME,
                    headers,
                    buildUrl: (txHash: Hex, _chainId: number): string =>
                        `${this.baseUrl}/api/v1/bungee/status?txHash=${txHash}`,
                    extractOpenedIntent,
                },
            },
            fillWatcherConfig: {
                ...fillWatcherBase,
                buildEndpoint: (params): string =>
                    `/api/v1/bungee/status?requestHash=${params.orderId}`,
            } as FillWatcherConfig,
            onChainFillWatcherConfig: {
                ...fillWatcherBase,
                buildEndpoint: (params): string =>
                    `/api/v1/bungee/status?txHash=${params.openTxHash}`,
            } as FillWatcherConfig,
        };
    }

    /** @inheritdoc Bungee orders are tracked through Socket scanner. */
    override getOrderExplorers(params: GetOrderExplorersParams): OrderExplorers {
        const explorers = super.getOrderExplorers(params);
        if (params.originTxHash) {
            explorers.tracker = `${BUNGEE_EXPLORER_BASE_URL}/${params.originTxHash}`;
        }
        return explorers;
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

    /** Collect quotes; surface errors when no quotes were produced so failures are not hidden. */
    private collectQuotes(results: PromiseSettledResult<Quote[]>[]): Quote[] {
        const quotes = results
            .filter((r): r is PromiseFulfilledResult<Quote[]> => r.status === "fulfilled")
            .flatMap((r) => r.value);

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
            const autoQuotes = adaptQuotes(response, this.providerId, params);

            if (!this.quoteOptions.enableOtherProviders) {
                return autoQuotes;
            }

            const manualQuotes = await this.buildManualRouteQuotes(response);
            return [...autoQuotes, ...manualQuotes];
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

    /**
     * Build executable quotes for every manual route in a quote response.
     *
     * Each manual route requires an extra `/build-tx` call. They are issued in parallel
     * and individual failures (one bridge failing to build) do not abort the others —
     * the caller still gets the auto routes and any manual routes that succeeded.
     */
    private async buildManualRouteQuotes(response: BungeeQuoteResponse): Promise<Quote[]> {
        const manualRoutes = response.result.manualRoutes ?? [];
        if (manualRoutes.length === 0) return [];

        const builds = await Promise.allSettled(
            manualRoutes.map((route) =>
                this.apiService
                    .buildTx({ quoteId: route.quoteId })
                    .then((res) => ({ route, buildTx: res.result })),
            ),
        );

        return builds
            .filter(
                (
                    result,
                ): result is PromiseFulfilledResult<{
                    route: BungeeManualRoute;
                    buildTx: BungeeBuildTxResult;
                }> => {
                    if (result.status === "rejected") {
                        console.warn("Bungee build-tx failed for manual route:", result.reason);
                        return false;
                    }
                    return true;
                },
            )
            .map((result) =>
                adaptManualRouteQuote(
                    response,
                    result.value.route,
                    result.value.buildTx,
                    this.providerId,
                ),
            )
            .filter((quote): quote is Quote => quote !== null);
    }
}
