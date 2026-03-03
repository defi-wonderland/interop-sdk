import { Hex } from "viem";

import type {
    ExecutableQuote,
    GetQuotesError,
    GetQuotesResponse,
    SubmitOrderResponse,
} from "../schemas/quote.js";
import type { QuoteRequest } from "../schemas/quoteRequest.js";
import { AssetDiscoveryFailure } from "../errors/AssetDiscoveryFailure.exception.js";
import {
    AssetDiscoveryFactory,
    AssetDiscoveryOptions,
    AssetDiscoveryService,
    CrossChainProvider,
    DiscoveredAssets,
    mergeDiscoveredAssets,
    OrderTracker,
    OrderTrackerFactory,
    OrderTrackingInfo,
    ProviderNotFound,
    ProviderTimeout,
    RouteQuery,
    SortingStrategy,
    WatchOrderParams,
} from "../internal.js";
import { BestOutputStrategy } from "../sorting_strategies/bestOutput.strategy.js";
import { fromInteropAccountId } from "../utils/interopAccountId.js";

interface AggregatorConfig {
    providers: CrossChainProvider[];
    sortingStrategy?: SortingStrategy;
    timeoutMs?: number;
    trackerFactory?: OrderTrackerFactory;
}

const DEFAULT_TIMEOUT_MS = 15_000;
const getDefaultSortingStrategy = (): SortingStrategy => new BestOutputStrategy();

/**
 * Aggregates quotes from multiple providers and manages order execution and tracking.
 *
 * Replaces the former ProviderExecutor with SDK-native types.
 */
class Aggregator {
    private readonly providers: Record<string, CrossChainProvider>;
    private readonly sortingStrategy: SortingStrategy;
    private readonly timeoutMs: number;
    private readonly trackerFactory: OrderTrackerFactory;
    private readonly trackerCache: Map<string, OrderTracker> = new Map();
    private readonly discoveryCache: Map<string, AssetDiscoveryService> = new Map();

    /**
     * Constructor - internal use only, prefer createAggregator() factory
     * @internal
     * @param config - Configuration for the aggregator
     */
    constructor(config: AggregatorConfig) {
        const { providers, sortingStrategy, timeoutMs, trackerFactory } = config;
        this.providers = providers.reduce(
            (acc, provider) => {
                acc[provider.getProviderId()] = provider;
                return acc;
            },
            {} as Record<string, CrossChainProvider>,
        );
        this.sortingStrategy = sortingStrategy ?? getDefaultSortingStrategy();
        this.timeoutMs = timeoutMs ?? DEFAULT_TIMEOUT_MS;
        this.trackerFactory = trackerFactory ?? new OrderTrackerFactory();

        this.initDiscoveryServices(providers);
    }

    private initDiscoveryServices(providers: CrossChainProvider[]): void {
        const factory = new AssetDiscoveryFactory();
        for (const provider of providers) {
            const service = factory.createService(provider);
            if (service) {
                this.discoveryCache.set(provider.getProviderId(), service);
            }
        }
    }

    /**
     * Check whether a provider supports all assets in the quote request.
     * Uses SDK InteropAccountId format internally.
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
            const uniqueInteropAddresses = [...new Set(assets.map((a) => fromInteropAccountId(a)))];

            const assetPromises = uniqueInteropAddresses.map((interopAddr) => {
                const asset = assets.find((a) => fromInteropAccountId(a) === interopAddr)!;
                return discovery.isAssetSupported(asset.chainId, interopAddr);
            });

            const results = await Promise.all(assetPromises);
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
            Object.values(this.providers).map(async (provider) => {
                try {
                    const isSupported = await this.supportsRequestedAssets(provider, params);
                    if (!isSupported) {
                        return [];
                    }

                    const quotesPromise = provider.getQuotes(params).then((quotes) =>
                        quotes.map(
                            (quote): ExecutableQuote => ({
                                ...quote,
                                _providerId: provider.getProviderId(),
                            }),
                        ),
                    );

                    let timeout: NodeJS.Timeout;

                    const timeoutPromise = new Promise<never>((_, reject) => {
                        timeout = setTimeout(() => {
                            reject(new ProviderTimeout(`Timeout after ${this.timeoutMs}ms`));
                        }, this.timeoutMs);
                    });

                    return await Promise.race([quotesPromise, timeoutPromise]).finally(() => {
                        clearTimeout(timeout);
                    });
                } catch (error) {
                    if (error instanceof ProviderTimeout) {
                        return { error: error, errorMsg: error.message };
                    }
                    return {
                        error: new Error(String(error)),
                        errorMsg: (error as Error)?.message ?? "Unknown error",
                    };
                }
            }),
        ).then((results) => results.flat());

        const response = this.splitQuotesAndErrors(resultQuotes);

        return {
            quotes: this.sortingStrategy.sort(response.quotes),
            errors: response.errors,
        };
    }

    /**
     * Submit a signed order to the appropriate provider.
     * Looks up the provider from the quote's _providerId field and delegates.
     *
     * @param quote - The executable quote containing the order
     * @param signature - The EIP-712 signature (hex string)
     * @returns The submit order response (contains orderId for tracking)
     */
    async submitOrder(quote: ExecutableQuote, signature: Hex): Promise<SubmitOrderResponse> {
        const providerId = quote._providerId;

        const provider = this.providers[providerId];
        if (!provider) {
            throw new ProviderNotFound(providerId);
        }

        return provider.submitOrder(quote, signature);
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

        const originMeta = assets.tokenMetadata[query.originAsset];
        const destMeta = assets.tokenMetadata[query.destinationAsset];

        if (!originMeta || !destMeta) {
            return [];
        }

        return originMeta.providers.filter((p) => destMeta.providers.includes(p));
    }

    private getOrCreateTracker(providerId: string): OrderTracker {
        if (this.trackerCache.has(providerId)) {
            return this.trackerCache.get(providerId)!;
        }

        const provider = this.providers[providerId];
        if (!provider) {
            throw new ProviderNotFound(providerId);
        }

        const tracker = this.trackerFactory.createTracker(provider);
        this.trackerCache.set(providerId, tracker);

        return tracker;
    }
}

/**
 * Create an aggregator
 * @param config - Configuration including providers, sorting strategy, timeout, and optional tracker factory
 * @returns The aggregator instance
 */
const createAggregator = (config: AggregatorConfig): Aggregator => {
    return new Aggregator(config);
};

export { Aggregator, createAggregator };
export type { AggregatorConfig };
