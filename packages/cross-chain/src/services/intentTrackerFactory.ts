import {
    CrossChainProvider,
    CustomEventOpenedIntentParser,
    EventBasedFillWatcher,
    FillWatcher,
    IntentTracker,
    IntentTrackerConfig,
    IntentTrackerFactoryConfig,
    OIFOpenedIntentParser,
    OpenedIntentParser,
    PublicClientManager,
} from "../internal.js";

/**
 * Factory class for creating IntentTracker instances
 * Centralizes tracker creation logic and configuration
 */
export class IntentTrackerFactory {
    private readonly clientManager: PublicClientManager;

    constructor(config?: IntentTrackerFactoryConfig) {
        this.clientManager = new PublicClientManager(config?.publicClient, config?.rpcUrls);
    }

    /**
     * Create an IntentTracker for a specific provider
     * @param provider - The provider to create tracker for
     * @param config - Optional custom implementations
     * @returns Configured IntentTracker instance
     */
    createTracker(
        provider: CrossChainProvider,
        config?: {
            openedIntentParser?: OpenedIntentParser;
            fillWatcher?: FillWatcher;
        },
    ): IntentTracker {
        const trackingConfig = provider.getTrackingConfig();

        // Create parser based on config type
        const openedIntentParser =
            config?.openedIntentParser ??
            this.createOpenedIntentParser(trackingConfig.openedIntentParser);

        const fillWatcher =
            config?.fillWatcher ??
            new EventBasedFillWatcher(trackingConfig.fillWatcher, {
                clientManager: this.clientManager,
            });

        return new IntentTracker(openedIntentParser, fillWatcher);
    }

    /**
     * Create the appropriate OpenedIntentParser based on config type
     */
    private createOpenedIntentParser(
        config: ReturnType<CrossChainProvider["getTrackingConfig"]>["openedIntentParser"],
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
 * Create an intent tracker for a provider (advanced use case)
 *
 * @param provider - Provider instance to create tracker for (must implement getTrackingConfig())
 * @param config - Optional configuration (custom implementations or RPC URLs)
 * @returns Configured IntentTracker instance
 *
 * @example
 * ```typescript
 * // Advanced usage: Direct tracker creation
 * const provider = new AcrossProvider();
 * const tracker = createIntentTracker(provider, {
 *   rpcUrls: {
 *     11155111: 'https://fast-sepolia.com',
 *     84532: 'https://fast-base.com'
 *   }
 * });
 *
 * // Watch an intent
 * for await (const update of tracker.watchIntent({
 *   txHash: "0x...",
 *   originChainId: 11155111,
 *   destinationChainId: 84532,
 * })) {
 *   console.log(update.status, update.message);
 * }
 * ```
 */
export function createIntentTracker(
    provider: CrossChainProvider,
    config?: IntentTrackerConfig,
): IntentTracker {
    const {
        publicClient,
        openedIntentParser: customParser,
        fillWatcher: customFillWatcher,
        rpcUrls,
    } = config || {};

    const factory = new IntentTrackerFactory({ publicClient, rpcUrls });
    return factory.createTracker(provider, {
        openedIntentParser: customParser,
        fillWatcher: customFillWatcher,
    });
}
