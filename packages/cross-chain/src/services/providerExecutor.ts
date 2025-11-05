import { Hex, TransactionRequest } from "viem";

import {
    BasicOpenParams,
    CrossChainProvider,
    EventBasedDepositInfoParser,
    EventBasedFillWatcher,
    GetQuoteParams,
    GetQuoteResponse,
    IntentTracker,
    OpenEventWatcher,
    ParamsParser,
    ProviderNotFound,
    PublicClientManager,
    ValidActions,
    WatchIntentParams,
} from "../internal.js";

type GetQuotesError = {
    errorMsg: string;
    error: Error;
};

type GetQuotesResponse = (GetQuoteResponse<ValidActions, BasicOpenParams> | GetQuotesError)[];

/**
 * Dependencies for the executor
 */
type ExecutorDependencies<SelectedParamParser> = {
    paramParser?: SelectedParamParser;
    /**
     * Optional RPC URLs for blockchain queries (quote generation, tracking, etc.)
     * Falls back to public RPCs if not provided
     */
    rpcUrls?: Record<number, string>;
};

/**
 * Result from executing a quote
 * Contains transaction requests and tracking context
 */
export interface ExecuteResult {
    /** Transaction requests to send */
    transactions: TransactionRequest[];
    /** Protocol used for execution */
    protocol: string;
    /** Origin chain ID */
    originChainId: number;
    /** Destination chain ID */
    destinationChainId: number;
}

/**
 * A service that get quotes in batches and executes cross-chain actions
 * Supports intent tracking for executed transactions using provider's tracking configurations
 *
 * Tracking features:
 * - Automatic tracker creation from provider configurations
 * - Event-based status updates for UI integration
 * - Tracker caching for efficiency (one instance per protocol)
 * - Optional custom RPC URLs for faster blockchain queries
 *
 * TODO: Improve types declaration to define getQuotesParams interface depending on the selected param parser
 */
class ProviderExecutor<
    GetQuotesExecutorParams,
    SelectedParamParser extends ParamsParser<GetQuotesExecutorParams>,
> {
    private readonly providers: Record<string, CrossChainProvider<BasicOpenParams>>;
    private readonly paramParser?: SelectedParamParser;
    private readonly rpcUrls?: Record<number, string>;
    private readonly trackerCache: Map<string, IntentTracker> = new Map();

    /**
     * Constructor - internal use only, prefer createProviderExecutor() factory
     * @internal
     * @param providers - Provider map (keyed by protocol name)
     * @param dependencies - Optional dependencies (param parser, RPC URLs)
     */
    constructor(
        providers: Record<string, CrossChainProvider<BasicOpenParams>>,
        dependencies: ExecutorDependencies<SelectedParamParser>,
    ) {
        this.paramParser = dependencies.paramParser;
        this.rpcUrls = dependencies.rpcUrls;
        this.providers = providers;
    }

    /**
     * Get quotes for a cross-chain action from all providers
     * @param action - The action to get quotes for
     * @param params - The parameters for the action
     * @returns The quotes for the action
     */
    async getQuotes<Action extends ValidActions>(
        action: Action,
        params: SelectedParamParser extends undefined
            ? GetQuoteParams<Action>
            : GetQuotesExecutorParams,
    ): Promise<GetQuotesResponse> {
        const parsedParams = this.paramParser
            ? await this.paramParser.parseGetQuoteParams(action, params)
            : (params as GetQuoteParams<Action>);

        const quotes = await Promise.all(
            Object.values(this.providers).map(async (provider) => {
                try {
                    return await provider.getQuote(action, parsedParams);
                } catch (error) {
                    if (error instanceof Error) {
                        return {
                            errorMsg: error.message,
                            error,
                        };
                    }
                    return {
                        errorMsg: "Unknown error",
                        error: new Error(String(error)),
                    };
                }
            }),
        );

        return quotes;
    }

    /**
     * Execute a cross-chain action
     * @param quote - The quote to execute
     * @returns The transaction requests and execution context (for tracking)
     */
    async execute(quote: GetQuoteResponse<ValidActions, BasicOpenParams>): Promise<ExecuteResult> {
        const provider = this.providers[quote.protocol];
        if (!provider) {
            throw new ProviderNotFound(quote.protocol);
        }

        const transactions = await provider.simulateOpen(quote.openParams);

        // Extract chain IDs from quote params
        const { originChainId, destinationChainId } = this.extractChainIds(quote);

        return {
            transactions,
            protocol: quote.protocol,
            originChainId,
            destinationChainId,
        };
    }

    /**
     * Extract chain IDs from quote parameters
     * @private
     */
    private extractChainIds(quote: GetQuoteResponse<ValidActions, BasicOpenParams>): {
        originChainId: number;
        destinationChainId: number;
    } {
        const params = quote.openParams.params as Record<string, unknown>;
        const originChainId = Number(
            (params.inputChainId as number) || (params.originChainId as number),
        );
        const destinationChainId = Number(
            (params.outputChainId as number) || (params.destinationChainId as number),
        );

        return { originChainId, destinationChainId };
    }

    /**
     * Prepare tracking for an executed transaction
     * Returns an IntentTracker instance that can be used to set up event listeners
     * before sending the transaction
     *
     * @param result - The result from execute()
     * @returns IntentTracker instance (not started yet)
     *
     * @example
     * ```typescript
     * const result = await executor.execute(quote);
     * const tracker = executor.prepareTracking(result);
     *
     * // Set up listeners
     * tracker.on('filled', (update) => console.log('Filled!'));
     *
     * // Send transaction
     * const txHash = await wallet.sendTransaction(result.transactions[1]);
     *
     * // Start tracking
     * await tracker.startTracking({
     *   txHash,
     *   originChainId: result.originChainId,
     *   destinationChainId: result.destinationChainId
     * });
     * ```
     */
    prepareTracking(result: ExecuteResult): IntentTracker {
        return this.getOrCreateTracker(result.protocol);
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
     *   protocol: 'across',
     *   originChainId: 11155111,
     *   destinationChainId: 84532
     * });
     *
     * tracker.on('filled', (update) => console.log('Done!'));
     * ```
     */
    track(params: {
        txHash: Hex;
        protocol: string;
        originChainId: number;
        destinationChainId: number;
        timeout?: number;
    }): IntentTracker {
        const tracker = this.getOrCreateTracker(params.protocol);

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
     * Get or create a cached tracker for a protocol
     * Uses provider instance's getTrackingConfig() method to get protocol-specific configuration
     * Trackers are created lazily and cached per protocol for efficiency
     *
     * @private
     * @param protocol - Protocol name to get tracker for
     * @returns IntentTracker instance
     * @throws {ProviderNotFound} If provider is not registered in executor
     */
    private getOrCreateTracker(protocol: string): IntentTracker {
        // Check cache first
        if (this.trackerCache.has(protocol)) {
            return this.trackerCache.get(protocol)!;
        }

        // Get provider instance (executor already has it)
        const provider = this.providers[protocol];
        if (!provider) {
            throw new ProviderNotFound(protocol);
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
        this.trackerCache.set(protocol, tracker);

        return tracker;
    }
}

/**
 * Create a provider executor
 * Accepts providers of any OpenParams type as long as they extend BasicOpenParams
 * The factory handles type widening internally while maintaining type safety
 *
 * @param providers - The providers to use (can be different OpenParams types)
 * @param dependencies - Optional dependencies (param parser, RPC URLs)
 * @returns The provider executor
 *
 * @example
 * ```typescript
 * // No type assertions needed!
 * const executor = createProviderExecutor([
 *   new AcrossProvider(),
 *   new OtherProvider(),
 * ], {
 *   rpcUrls: { 11155111: 'https://...' }
 * });
 * ```
 */
const createProviderExecutor = <
    GetQuotesExecutorParams,
    SelectedParamParser extends ParamsParser<GetQuotesExecutorParams>,
    P extends BasicOpenParams = BasicOpenParams,
>(
    providers: Array<CrossChainProvider<P>>,
    dependencies: ExecutorDependencies<SelectedParamParser> = {},
): ProviderExecutor<GetQuotesExecutorParams, SelectedParamParser> => {
    // Convert providers to map with type widening (safe - we only use base interface methods)
    const providerMap = providers.reduce(
        (acc, provider) => {
            acc[provider.getProtocolName()] = provider as CrossChainProvider<BasicOpenParams>;
            return acc;
        },
        {} as Record<string, CrossChainProvider<BasicOpenParams>>,
    );

    return new ProviderExecutor(providerMap, dependencies);
};

export { ProviderExecutor, createProviderExecutor };
