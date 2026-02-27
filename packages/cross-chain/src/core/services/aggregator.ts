import type { Hex } from "viem";

import type { InteropAccountId } from "../types/interopAccountId.js";
import type {
    ExecutableQuote,
    GetQuotesError,
    GetQuotesResponse,
    StepResult,
    SubmitOrderResponse,
} from "../types/quote.js";
import type { QuoteRequest } from "../types/quoteRequest.js";
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
} from "../../internal.js";
import { AssetDiscoveryFailure } from "../errors/AssetDiscoveryFailure.exception.js";
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
 * Aggregates quotes from multiple cross-chain providers and handles order submission and tracking.
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

    /**
     * Create and cache discovery services for all providers that support it.
     * Each service starts prefetching immediately via the factory.
     */
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

            const assets: InteropAccountId[] = [params.input.asset, params.output.asset];

            const checks = assets.map((asset) => {
                // Need ERC-7930 for discovery service (it still uses wire format)
                const hex = fromInteropAccountId(asset);
                return discovery.isAssetSupported(asset.chainId, hex);
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
     * Get quotes for a cross-chain action from all providers.
     *
     * Passes the SDK {@link QuoteRequest} directly to providers. Each provider
     * handles its own conversion to wire format internally.
     *
     * @param params - The SDK quote request
     * @returns Sorted quotes and any errors
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
                        errorMsg: (error as Error).message ?? "Unknown error",
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
     * Submit a signature-step order to the solver.
     *
     * Only applies to **signature-step** orders (escrow, 3009, resource-lock)
     * where the solver needs the user's EIP-712 signature to authorize the intent.
     *
     * For **transaction-step** orders (user-open, Across), do NOT call this method —
     * the tx is already on-chain and the solver sees it directly. Use
     * {@link prepareTracking} to monitor progress.
     *
     * Also accepts an array of {@link StepResult} for future multi-step orders
     * with multiple signature steps.
     *
     * @example Single signature step (most common)
     * ```typescript
     * const sig = await wallet.signTypedData(quote.order.steps[0].signaturePayload);
     * const { orderId } = await aggregator.submitOrder(quote, sig);
     * ```
     *
     * @throws {Error} If the order has no signature steps
     */
    async submitOrder(
        quote: ExecutableQuote,
        signatureOrResults: Hex | StepResult[],
    ): Promise<SubmitOrderResponse> {
        const providerId = quote._providerId;

        const provider = this.providers[providerId];
        if (!provider) {
            throw new ProviderNotFound(providerId);
        }

        // Extract the signature
        let signature: Hex;
        if (typeof signatureOrResults === "string") {
            signature = signatureOrResults;
        } else {
            const sigResult = signatureOrResults.find((r) => r.signature);
            if (!sigResult?.signature) {
                throw new Error("No signature found in step results");
            }
            signature = sigResult.signature;
        }

        // Delegate to provider
        return provider.submitOrder(quote, signature);
    }

    /**
     * Prepare tracking for an executed transaction
     * Returns an OrderTracker instance that can be used to set up event listeners
     * before sending the transaction
     *
     * @param providerId - The provider ID to get tracker for
     * @returns OrderTracker instance (not started yet)
     *
     * @example
     * ```typescript
     * const tracker = aggregator.prepareTracking('across');
     *
     * tracker.on('finalized', (update) => console.log('Finalized!'));
     * tracker.on('failed', (update) => console.log('Failed'));
     *
     * await tracker.startTracking({
     *   txHash: response.txHash,
     *   originChainId: 11155111,
     *   destinationChainId: 84532
     * });
     * ```
     */
    prepareTracking(providerId: string): OrderTracker {
        return this.getOrCreateTracker(providerId);
    }

    /**
     * Track an existing transaction (power user method)
     * Creates or reuses a tracker and immediately starts tracking
     *
     * @param params - Tracking parameters
     * @returns OrderTracker instance (already started)
     *
     * @example
     * ```typescript
     * const tracker = aggregator.track({
     *   txHash: '0x123...',
     *   providerId: 'across',
     *   originChainId: 11155111,
     *   destinationChainId: 84532
     * });
     *
     * tracker.on('finalized', (update) => console.log('Done!'));
     * ```
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
     * This is a simple, one-time status check
     *
     * @param params - Status query parameters
     * @returns Current order status information
     *
     * @example
     * ```typescript
     * const status = await aggregator.getOrderStatus({
     *   txHash: '0x123...',
     *   providerId: 'across',
     *   originChainId: 11155111
     * });
     *
     * console.log(status.status); // OrderStatus | 'expired'
     * ```
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
     *
     * Aggregates asset discovery results from all registered providers into
     * a single DiscoveredAssets structure with CAIP-2 chain keys and flat
     * token metadata. Uses the pre-warmed discovery cache so results are
     * typically available immediately.
     *
     * @param options - Discovery options (chain filtering)
     * @returns Aggregated discovered assets
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
     *
     * Both assets use EIP-7930 interop addresses (which encode chain ID),
     * so the lookup is two direct hits into `tokenMetadata`. Discovery data
     * is pre-warmed at construction, so this resolves near-instantly.
     *
     * @param query - Route query with origin and destination interop addresses
     * @returns Array of provider IDs that support the route
     *
     * @example
     * ```typescript
     * const providers = await aggregator.getProvidersForRoute({
     *   originAsset: "0x000100000101A0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
     *   destinationAsset: "0x00010000A4B10101af88d065e77c8cC2239327C5EDb3A432268e5831",
     * });
     * ```
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

    /**
     * Get or create a cached tracker for a provider
     * @private
     */
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
 * Create a quote aggregator
 * @param config - Configuration including providers, sorting strategy, timeout, and optional tracker factory
 * @returns The aggregator
 *
 * @example
 * ```typescript
 * const aggregator = createAggregator({
 *   providers: [new AcrossProvider()],
 *   trackerFactory: new OrderTrackerFactory({
 *     rpcUrls: { 11155111: 'https://...' }
 *   })
 * });
 * ```
 */
const createAggregator = (config: AggregatorConfig): Aggregator => {
    return new Aggregator(config);
};

export { Aggregator, createAggregator };
export type { AggregatorConfig };
