import { GetQuoteRequest, PostOrderResponse } from "@openintentsframework/oif-specs";
import { EIP1193Provider, Hex } from "viem";

import {
    CrossChainProvider,
    EventBasedDepositInfoParser,
    EventBasedFillWatcher,
    ExecutableQuote,
    IntentTracker,
    OpenEventWatcher,
    ProviderNotFound,
    ProviderTimeout,
    PublicClientManager,
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
    rpcUrls?: Record<number, string>;
}

const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * A service that get quotes in batches and executes cross-chain actions
 * Supports intent tracking for executed transactions using provider's tracking configurations
 *
 * Tracking features:
 * - Automatic tracker creation from provider configurations
 * - Event-based status updates for UI integration
 * - Tracker caching for efficiency (one instance per protocol)
 * - Optional custom RPC URLs for faster blockchain queries
 */
class ProviderExecutor {
    private readonly providers: Record<string, CrossChainProvider>;
    private readonly sortingStrategy?: SortingStrategy;
    private readonly timeoutMs: number;
    private readonly rpcUrls?: Record<number, string>;
    private readonly trackerCache: Map<string, IntentTracker> = new Map();

    /**
     * Constructor - internal use only, prefer createProviderExecutor() factory
     * @internal
     * @param config - Configuration for the executor
     */
    constructor(config: ProviderExecutorConfig) {
        const { providers, sortingStrategy, timeoutMs, rpcUrls } = config;
        this.providers = providers.reduce(
            (acc, provider) => {
                acc[provider.getProviderId()] = provider;
                return acc;
            },
            {} as Record<string, CrossChainProvider>,
        );
        this.sortingStrategy = sortingStrategy;
        this.timeoutMs = timeoutMs ?? DEFAULT_TIMEOUT_MS;
        this.rpcUrls = rpcUrls;
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

        // Start tracking asynchronously
        const trackingParams: WatchIntentParams = {
            txHash: params.txHash,
            originChainId: params.originChainId,
            destinationChainId: params.destinationChainId,
            timeout: params.timeout,
        };

        // Start tracking in background
        tracker.startTracking(trackingParams).catch((error) => {
            // Error will be emitted via 'error' event
            console.error("Tracking error:", error);
        });

        return tracker;
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
        // Check cache first
        if (this.trackerCache.has(providerId)) {
            return this.trackerCache.get(providerId)!;
        }

        // Get provider instance (executor already has it)
        const provider = this.providers[providerId];
        if (!provider) {
            throw new ProviderNotFound(providerId);
        }

        // Get tracking config from provider instance (no hardcoded protocol logic!)
        const config = provider.getTrackingConfig();

        // Create PublicClientManager with optional custom RPCs
        const clientManager = new PublicClientManager(undefined, this.rpcUrls);

        // Create OpenEventWatcher (protocol-agnostic, uses EIP-7683)
        const openWatcher = new OpenEventWatcher({ clientManager });

        // Create protocol-specific services using provider's config
        const depositInfoParser = new EventBasedDepositInfoParser(config.depositInfoParser, {
            clientManager,
        });

        const fillWatcher = new EventBasedFillWatcher(config.fillWatcher, {
            clientManager,
        });

        // Create and cache tracker
        const tracker = new IntentTracker(openWatcher, depositInfoParser, fillWatcher);
        this.trackerCache.set(providerId, tracker);

        return tracker;
    }
}

/**
 * Create a provider executor
 * @param config - Configuration including providers, sorting strategy, timeout, and RPC URLs
 * @returns The provider executor
 *
 * @example
 * ```typescript
 * const executor = createProviderExecutor({
 *   providers: [new AcrossProvider()],
 *   rpcUrls: { 11155111: 'https://...' }
 * });
 * ```
 */
const createProviderExecutor = (config: ProviderExecutorConfig): ProviderExecutor => {
    return new ProviderExecutor(config);
};

export { ProviderExecutor, createProviderExecutor };
