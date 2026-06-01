import { Hex } from "viem";

import type { ApprovalService } from "../interfaces/approval.interface.js";
import type { AssetDiscoveryService } from "../interfaces/assetDiscovery.interface.js";
import type {
    ExecutableQuote,
    GetQuotesError,
    GetQuotesResponse,
    SubmitOrderResponse,
} from "../schemas/quote.js";
import type { BuildQuoteRequest, QuoteRequest } from "../schemas/quoteRequest.js";
import type {
    AssetDiscoveryOptions,
    DiscoveredAssets,
    RouteQuery,
} from "../types/assetDiscovery.js";
import type { OrderTrackingInfo, WatchOrderParams } from "../types/orderTracking.js";
import { AssetDiscoveryFailure } from "../errors/AssetDiscoveryFailure.exception.js";
import { DuplicateProvider } from "../errors/DuplicateProvider.exception.js";
import { ProviderNotFound } from "../errors/ProviderNotFound.exception.js";
import { ProviderTimeout } from "../errors/ProviderTimeout.exception.js";
import { CrossChainProvider } from "../interfaces/crossChainProvider.interface.js";
import { SortingStrategy } from "../interfaces/sortingStrategy.interface.js";
import { BestOutputStrategy } from "../sorting_strategies/bestOutput.strategy.js";
import { mergeDiscoveredAssets } from "../utils/toDiscoveredAssets.js";
import { toCanonicalNativeAddress } from "../utils/token.js";
import {
    validateAssetSupport,
    validateBuildQuoteParams,
} from "../validators/buildQuoteValidator.js";
import { OrderTracker } from "./OrderTracker.js";

interface AggregatorConfig {
    providers: CrossChainProvider[];
    sortingStrategy?: SortingStrategy;
    timeoutMs?: number;
    trackerFactory?: {
        createTracker(provider: CrossChainProvider): OrderTracker;
    };
    discoveryFactory?: {
        createService(provider: CrossChainProvider): AssetDiscoveryService | null;
    };
    approvalService?: ApprovalService;
}

const DEFAULT_TIMEOUT_MS = 15_000;
const getDefaultSortingStrategy = (): SortingStrategy => new BestOutputStrategy();

/**
 * Aggregates quotes from multiple providers and manages order execution and tracking.
 *
 * Uses SDK-native types throughout.
 */
class Aggregator {
    private readonly providers: Map<string, CrossChainProvider>;
    private readonly sortingStrategy: SortingStrategy;
    private readonly timeoutMs: number;
    private readonly trackerFactory: AggregatorConfig["trackerFactory"];
    private readonly approvalService: AggregatorConfig["approvalService"];
    private readonly trackerCache: Map<string, OrderTracker> = new Map();
    private readonly discoveryCache: Map<string, AssetDiscoveryService> = new Map();

    /**
     * Constructor - internal use only, prefer createAggregator() factory
     * @internal
     * @param config - Configuration for the aggregator
     */
    constructor(config: AggregatorConfig) {
        const {
            providers,
            sortingStrategy,
            timeoutMs,
            trackerFactory,
            discoveryFactory,
            approvalService,
        } = config;
        this.providers = new Map();
        for (const provider of providers) {
            const id = provider.getProviderId();
            if (this.providers.has(id)) {
                throw new DuplicateProvider(id);
            }
            this.providers.set(id, provider);
        }
        this.sortingStrategy = sortingStrategy ?? getDefaultSortingStrategy();
        this.timeoutMs = timeoutMs ?? DEFAULT_TIMEOUT_MS;
        this.trackerFactory = trackerFactory;
        this.approvalService = approvalService;

        if (discoveryFactory) {
            this.initDiscoveryServices(providers, discoveryFactory);
        }
    }

    private initDiscoveryServices(
        providers: CrossChainProvider[],
        factory: NonNullable<AggregatorConfig["discoveryFactory"]>,
    ): void {
        for (const provider of providers) {
            const service = factory.createService(provider);
            if (service) {
                this.discoveryCache.set(provider.getProviderId(), service);
            }
        }
    }

    /**
     * Check whether a provider supports all assets in the quote request.
     * Returns false if any input or output asset is not supported, avoiding unnecessary HTTP calls.
     * Uses the pre-warmed discovery cache so this is typically instant.
     */
    private async supportsRequestedAssets(
        provider: CrossChainProvider,
        params: QuoteRequest,
    ): Promise<boolean> {
        try {
            const discovery = this.discoveryCache.get(provider.getProviderId());
            if (!discovery) return true;

            const assets = [
                { chainId: params.input.chainId, address: params.input.assetAddress },
                { chainId: params.output.chainId, address: params.output.assetAddress },
            ];

            const checks = assets.map((asset) => {
                return discovery.isAssetSupported(asset.chainId, asset.address);
            });

            const results = await Promise.all(checks);
            return results.every((result) => result !== null);
        } catch (error) {
            if (error instanceof AssetDiscoveryFailure) {
                console.warn(
                    `[Aggregator] Asset discovery failed for ${provider.getProviderId()}: ${error.message}`,
                    error.details,
                );
            } else {
                console.warn(
                    `[Aggregator] Unexpected error checking asset support for ${provider.getProviderId()}:`,
                    error,
                );
            }
            return true;
        }
    }

    private splitQuotesAndErrors(quotes: (ExecutableQuote | GetQuotesError)[]): GetQuotesResponse {
        return {
            quotes: quotes.filter((quote) => "order" in quote) as ExecutableQuote[],
            errors: quotes.filter((quote) => "error" in quote) as GetQuotesError[],
        };
    }

    /**
     * Get quotes for a cross-chain action from all providers
     * @param params - SDK quote request with readable addresses
     * @returns Sorted quotes and any provider errors
     */
    async getQuotes(params: QuoteRequest): Promise<GetQuotesResponse> {
        const resultQuotes = await Promise.all(
            [...this.providers.values()].map(async (provider) => {
                const isSupported = await this.supportsRequestedAssets(provider, params);
                if (!isSupported) {
                    return [];
                }

                const startedAt = performance.now();

                try {
                    const quotesPromise = provider.getQuotes(params);

                    let timeout: NodeJS.Timeout;

                    const timeoutPromise = new Promise<never>((_, reject) => {
                        timeout = setTimeout(() => {
                            reject(new ProviderTimeout(`Timeout after ${this.timeoutMs}ms`));
                        }, this.timeoutMs);
                    });

                    const quotes = await Promise.race([quotesPromise, timeoutPromise]).finally(() =>
                        clearTimeout(timeout),
                    );

                    const latencyMs = Math.round(performance.now() - startedAt);
                    return quotes.map(
                        (quote): ExecutableQuote => ({
                            ...quote,
                            latencyMs,
                            _providerId: provider.getProviderId(),
                        }),
                    );
                } catch (error) {
                    const latencyMs = Math.round(performance.now() - startedAt);
                    const providerId = provider.getProviderId();
                    if (error instanceof ProviderTimeout) {
                        return { error, errorMsg: error.message, latencyMs, providerId };
                    }
                    return {
                        error: new Error(String(error)),
                        errorMsg: (error as Error)?.message ?? "Unknown error",
                        latencyMs,
                        providerId,
                    };
                }
            }),
        ).then((results) => results.flat());

        const response = this.splitQuotesAndErrors(resultQuotes);
        let sortedQuotes = this.sortingStrategy.sort(response.quotes);

        if (this.approvalService) {
            try {
                sortedQuotes = await this.approvalService.enrichQuotes(sortedQuotes);
            } catch (error) {
                console.warn("[Aggregator] Approval enrichment failed:", error);
            }
        }

        return {
            quotes: sortedQuotes,
            errors: response.errors,
        };
    }

    /**
     * Submit a signature-step order to the solver.
     *
     * @throws {ProviderNotFound} If the quote's provider is not registered
     */
    async submitOrder(quote: ExecutableQuote, signature: Hex): Promise<SubmitOrderResponse> {
        const providerId = quote._providerId;

        const provider = this.providers.get(providerId);
        if (!provider) {
            throw new ProviderNotFound(providerId);
        }

        return provider.submitOrder(quote, signature);
    }

    /**
     * Build a quote locally without calling a solver API.
     *
     * Routes the request to the specified provider's `buildQuote` implementation.
     * The returned quote contains a TransactionStep that the consumer can execute
     * directly via `walletClient.sendTransaction`.
     *
     * @param providerId - The provider to use for building the quote
     * @param params - The build quote request with required amounts and contract address
     * @returns An executable quote containing a TransactionStep
     */
    async buildQuote(providerId: string, params: BuildQuoteRequest): Promise<ExecutableQuote> {
        const provider = this.providers.get(providerId);
        if (!provider) {
            throw new ProviderNotFound(providerId);
        }

        const discovered = await this.discoverAssets();
        validateBuildQuoteParams(params, discovered.tokenMetadata);

        const isSupported = await this.supportsRequestedAssets(provider, params);
        validateAssetSupport(params, providerId, isSupported);

        const quote = await provider.buildQuote(params);
        let executable: ExecutableQuote = { ...quote, _providerId: providerId };

        if (this.approvalService) {
            try {
                const [enriched] = await this.approvalService.enrichQuotes([executable]);
                if (enriched) executable = enriched;
            } catch (error) {
                console.warn("[Aggregator] Approval enrichment failed:", error);
            }
        }

        return executable;
    }

    /**
     * Prepare tracking for an executed transaction
     * Returns an OrderTracker instance that can be used to set up event listeners
     * before sending the transaction
     */
    prepareTracking(providerId: string): OrderTracker {
        return this.getOrCreateTracker(providerId);
    }

    /**
     * Track an existing transaction (power user method)
     * Creates or reuses a tracker and immediately starts tracking
     */
    track(params: {
        txHash: Hex;
        providerId: string;
        originChainId: number;
        destinationChainId: number;
        timeout?: number;
    }): OrderTracker {
        const tracker = this.getOrCreateTracker(params.providerId);

        const trackingParams: WatchOrderParams = {
            txHash: params.txHash,
            originChainId: params.originChainId,
            destinationChainId: params.destinationChainId,
            timeout: params.timeout,
        };

        tracker.startTracking(trackingParams).catch((error) => {
            console.error("Tracking error:", error);
        });

        return tracker;
    }

    /**
     * Get the current status of an order without setting up event-based tracking
     */
    async getOrderStatus(params: {
        txHash: Hex;
        providerId: string;
        originChainId: number;
    }): Promise<OrderTrackingInfo> {
        const tracker = this.getOrCreateTracker(params.providerId);
        return tracker.getOrderStatus(params.txHash, params.originChainId);
    }

    /**
     * Discover supported assets from all providers
     */
    async discoverAssets(options?: AssetDiscoveryOptions): Promise<DiscoveredAssets> {
        const promises = Array.from(this.discoveryCache.values()).map((service) =>
            service.getSupportedAssets(options),
        );

        const settled = await Promise.allSettled(promises);
        const results = settled
            .filter(
                (
                    outcome,
                ): outcome is PromiseSettledResult<DiscoveredAssets> & { status: "fulfilled" } =>
                    outcome.status === "fulfilled",
            )
            .map((outcome) => outcome.value);

        if (results.length === 0) {
            return { tokensByChain: {}, tokenMetadata: {} } as DiscoveredAssets;
        }

        return mergeDiscoveredAssets(results);
    }

    /**
     * Find which providers support a given origin/destination route.
     */
    async getProvidersForRoute(query: RouteQuery): Promise<string[]> {
        const assets = await this.discoverAssets();

        const originMeta =
            assets.tokenMetadata[query.originChainId]?.[
                toCanonicalNativeAddress(query.originAsset, "eip155")
            ];
        const destMeta =
            assets.tokenMetadata[query.destinationChainId]?.[
                toCanonicalNativeAddress(query.destinationAsset, "eip155")
            ];

        if (!originMeta || !destMeta) {
            return [];
        }

        return originMeta.providers.filter((p) => destMeta.providers.includes(p));
    }

    private getOrCreateTracker(providerId: string): OrderTracker {
        if (this.trackerCache.has(providerId)) {
            return this.trackerCache.get(providerId)!;
        }

        const provider = this.providers.get(providerId);
        if (!provider) {
            throw new ProviderNotFound(providerId);
        }

        if (!this.trackerFactory) {
            throw new Error(
                "No trackerFactory provided. Pass a trackerFactory in AggregatorConfig to use tracking.",
            );
        }
        const tracker = this.trackerFactory.createTracker(provider);
        this.trackerCache.set(providerId, tracker);

        return tracker;
    }
}

export { Aggregator };
export type { AggregatorConfig };
