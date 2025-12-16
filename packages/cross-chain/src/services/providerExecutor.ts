import { GetQuoteRequest, PostOrderResponse } from "@openintentsframework/oif-specs";
import { EIP1193Provider, Hex } from "viem";

import {
    CrossChainProvider,
    ExecutableQuote,
    IntentStatusInfo,
    IntentTracker,
    IntentTrackerFactory,
    ProviderNotFound,
    ProviderTimeout,
    SortingStrategy,
    WatchIntentParams,
} from "../internal.js";

type GetQuotesError = {
    errorMsg: string;
    error: Error;
};

interface GetQuotesResponse {
    quotes: ExecutableQuote[];
    errors: GetQuotesError[];
}

interface ProviderExecutorConfig {
    providers: CrossChainProvider[];
    sortingStrategy?: SortingStrategy;
    timeoutMs?: number;
    trackerFactory?: IntentTrackerFactory;
}

const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * A service that get quotes in batches and executes cross-chain actions
 */
class ProviderExecutor {
    private readonly providers: Record<string, CrossChainProvider>;
    private readonly sortingStrategy?: SortingStrategy;
    private readonly timeoutMs: number;
    private readonly trackerFactory: IntentTrackerFactory;
    private readonly trackerCache: Map<string, IntentTracker> = new Map();

    /**
     * Constructor - internal use only, prefer createProviderExecutor() factory
     * @internal
     * @param config - Configuration for the executor
     */
    constructor(config: ProviderExecutorConfig) {
        const { providers, sortingStrategy, timeoutMs, trackerFactory } = config;
        this.providers = providers.reduce(
            (acc, provider) => {
                acc[provider.getProviderId()] = provider;
                return acc;
            },
            {} as Record<string, CrossChainProvider>,
        );
        this.sortingStrategy = sortingStrategy;
        this.timeoutMs = timeoutMs ?? DEFAULT_TIMEOUT_MS;
        this.trackerFactory = trackerFactory ?? new IntentTrackerFactory();
    }

    private splitQuotesAndErrors(quotes: (ExecutableQuote | GetQuotesError)[]): GetQuotesResponse {
        return {
            quotes: quotes.filter((quote) => "order" in quote) as ExecutableQuote[],
            errors: quotes.filter((quote) => "error" in quote) as GetQuotesError[],
        };
    }

    /**
     * Get quotes for a cross-chain action from all providers
     * @param params - The parameters for the action
     * @returns The quotes for the action
     */
    async getQuotes(params: GetQuoteRequest): Promise<GetQuotesResponse> {
        const resultQuotes = await Promise.all(
            Object.values(this.providers).map(async (provider) => {
                try {
                    const quotesPromise = provider.getQuotes(params).then((quotes) =>
                        quotes.map((quote) => ({
                            ...quote,
                            provider: provider.getProviderId(),
                        })),
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

        if (this.sortingStrategy) {
            return {
                quotes: this.sortingStrategy.sort(response.quotes),
                errors: response.errors,
            };
        }

        return response;
    }

    /**
     * Execute a cross-chain action
     * @param quote - The quote to execute
     * @param signer - The signer to use to sign the order
     * @returns The response from the provider
     */
    async execute(quote: ExecutableQuote, signer: EIP1193Provider): Promise<PostOrderResponse> {
        const provider = this.providers[quote.provider ?? ""];
        if (!provider) {
            throw new ProviderNotFound(quote.provider ?? "No provider id in quote");
        }
        return provider.execute(quote, signer);
    }

    /**
     * Prepare tracking for an executed transaction
     * Returns an IntentTracker instance that can be used to set up event listeners
     * before sending the transaction
     *
     * @param providerId - The provider ID to get tracker for
     * @returns IntentTracker instance (not started yet)
     *
     * @example
     * ```typescript
     * const tracker = executor.prepareTracking('across');
     *
     * // Set up listeners
     * tracker.on('filled', (update) => console.log('Filled!'));
     *
     * // Execute and get tx hash
     * const response = await executor.execute(quote, signer);
     *
     * // Start tracking
     * await tracker.startTracking({
     *   txHash: response.txHash,
     *   originChainId: 11155111,
     *   destinationChainId: 84532
     * });
     * ```
     */
    prepareTracking(providerId: string): IntentTracker {
        return this.getOrCreateTracker(providerId);
    }

    /**
     * Track an existing transaction (power user method)
     * Creates or reuses a tracker and immediately starts tracking
     *
     * @param params - Tracking parameters
     * @returns IntentTracker instance (already started)
     *
     * @example
     * ```typescript
     * const tracker = executor.track({
     *   txHash: '0x123...',
     *   providerId: 'across',
     *   originChainId: 11155111,
     *   destinationChainId: 84532
     * });
     *
     * tracker.on('filled', (update) => console.log('Done!'));
     * ```
     */
    track(params: {
        txHash: Hex;
        providerId: string;
        originChainId: number;
        destinationChainId: number;
        timeout?: number;
    }): IntentTracker {
        const tracker = this.getOrCreateTracker(params.providerId);

        const trackingParams: WatchIntentParams = {
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
     * Get the current status of an intent without setting up event-based tracking
     * This is a simple, one-time status check
     *
     * @param params - Status query parameters
     * @returns Current intent status information
     *
     * @example
     * ```typescript
     * const status = await executor.getIntentStatus({
     *   txHash: '0x123...',
     *   providerId: 'across',
     *   originChainId: 11155111
     * });
     *
     * console.log(status.status); // 'filled' | 'filling' | 'expired'
     * ```
     */
    async getIntentStatus(params: {
        txHash: Hex;
        providerId: string;
        originChainId: number;
    }): Promise<IntentStatusInfo> {
        const tracker = this.getOrCreateTracker(params.providerId);
        return tracker.getIntentStatus(params.txHash, params.originChainId);
    }

    /**
     * Get or create a cached tracker for a provider
     * Uses provider instance's getTrackingConfig() method to get protocol-specific configuration
     * Trackers are created lazily and cached per provider for efficiency
     *
     * @private
     * @param providerId - Provider ID to get tracker for
     * @returns IntentTracker instance
     * @throws {ProviderNotFound} If provider is not registered in executor
     */
    private getOrCreateTracker(providerId: string): IntentTracker {
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
 * Create a provider executor
 * @param config - Configuration including providers, sorting strategy, timeout, and optional tracker factory
 * @returns The provider executor
 *
 * @example
 * ```typescript
 * const executor = createProviderExecutor({
 *   providers: [new AcrossProvider()],
 *   trackerFactory: new IntentTrackerFactory({
 *     rpcUrls: { 11155111: 'https://...' }
 *   })
 * });
 * ```
 */
const createProviderExecutor = (config: ProviderExecutorConfig): ProviderExecutor => {
    return new ProviderExecutor(config);
};

export { ProviderExecutor, createProviderExecutor };
