import {
    CrossChainProvider,
    CustomEventOpenedIntentParser,
    EventBasedFillWatcher,
    FillWatcher,
    OIFOpenedIntentParser,
    OpenedIntentParser,
    OrderTracker,
    OrderTrackerConfig,
    OrderTrackerFactoryConfig,
    PublicClientManager,
} from "../internal.js";

/**
 * Factory class for creating OrderTracker instances
 * Centralizes tracker creation logic and configuration
 */
export class OrderTrackerFactory {
    private readonly clientManager: PublicClientManager;

    constructor(config?: OrderTrackerFactoryConfig) {
        this.clientManager = new PublicClientManager(config?.publicClient, config?.rpcUrls);
    }

    /**
     * Create an OrderTracker for a specific provider
     * @param provider - The provider to create tracker for
     * @param config - Optional custom implementations
     * @returns Configured OrderTracker instance
     */
    createTracker(
        provider: CrossChainProvider,
        config?: {
            openedIntentParser?: OpenedIntentParser;
            fillWatcher?: FillWatcher;
        },
    ): OrderTracker {
        const trackingConfig = provider.getTrackingConfig();

        const openedIntentParser =
            config?.openedIntentParser ??
            this.createOpenedIntentParser(trackingConfig.openedIntentParserConfig);

        const fillWatcher =
            config?.fillWatcher ??
            new EventBasedFillWatcher(trackingConfig.fillWatcherConfig, {
                clientManager: this.clientManager,
            });

        return new OrderTracker(openedIntentParser, fillWatcher, this.clientManager);
    }

    /**
     * Create the appropriate OpenedIntentParser based on config type
     */
    private createOpenedIntentParser(
        config: ReturnType<CrossChainProvider["getTrackingConfig"]>["openedIntentParserConfig"],
    ): OpenedIntentParser {
        switch (config.type) {
            case "oif":
                return new OIFOpenedIntentParser({ clientManager: this.clientManager });

            case "custom-event":
                return new CustomEventOpenedIntentParser(config.config, {
                    clientManager: this.clientManager,
                });

            case "api":
                // TODO: Implement APIOpenedIntentParser when needed
                throw new Error("API-based OpenedIntentParser not yet implemented");

            default:
                // Exhaustive check
                const _exhaustive: never = config;
                throw new Error(
                    `Unknown OpenedIntentParser config type: ${JSON.stringify(_exhaustive)}`,
                );
        }
    }
}

/**
 * Create an order tracker for a provider (advanced use case)
 *
 * @param provider - Provider instance to create tracker for (must implement getTrackingConfig())
 * @param config - Optional configuration (custom implementations or RPC URLs)
 * @returns Configured OrderTracker instance
 *
 * @example
 * ```typescript
 * const provider = new AcrossProvider();
 * const tracker = createOrderTracker(provider, {
 *   rpcUrls: {
 *     11155111: 'https://fast-sepolia.com',
 *     84532: 'https://fast-base.com'
 *   }
 * });
 *
 * for await (const update of tracker.watchOrder({
 *   txHash: "0x...",
 *   originChainId: 11155111,
 *   destinationChainId: 84532,
 * })) {
 *   console.log(update.status, update.message);
 * }
 * ```
 */
export function createOrderTracker(
    provider: CrossChainProvider,
    config?: OrderTrackerConfig,
): OrderTracker {
    const {
        publicClient,
        openedIntentParser: customParser,
        fillWatcher: customFillWatcher,
        rpcUrls,
    } = config || {};

    const factory = new OrderTrackerFactory({ publicClient, rpcUrls });
    return factory.createTracker(provider, {
        openedIntentParser: customParser,
        fillWatcher: customFillWatcher,
    });
}
