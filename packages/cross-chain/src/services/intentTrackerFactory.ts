import { PublicClient } from "viem";

import {
    CrossChainProvider,
    DepositInfoParser,
    EventBasedDepositInfoParser,
    EventBasedFillWatcher,
    FillWatcher,
    IntentTracker,
    OpenEventWatcher,
    PublicClientManager,
} from "../internal.js";

export interface IntentTrackerFactoryConfig {
    publicClient?: PublicClient;
    rpcUrls?: Record<number, string>;
}

export interface IntentTrackerConfig extends IntentTrackerFactoryConfig {
    depositInfoParser?: DepositInfoParser;
    fillWatcher?: FillWatcher;
}

/**
 * Factory class for creating IntentTracker instances
 * Centralizes tracker creation logic and configuration
 */
export class IntentTrackerFactory {
    private readonly clientManager: PublicClientManager;
    private readonly openWatcher: OpenEventWatcher;

    constructor(config?: IntentTrackerFactoryConfig) {
        this.clientManager = new PublicClientManager(config?.publicClient, config?.rpcUrls);
        this.openWatcher = new OpenEventWatcher({ clientManager: this.clientManager });
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
            depositInfoParser?: DepositInfoParser;
            fillWatcher?: FillWatcher;
        },
    ): IntentTracker {
        const trackingConfig = provider.getTrackingConfig();

        const depositInfoParser =
            config?.depositInfoParser ??
            new EventBasedDepositInfoParser(trackingConfig.depositInfoParser, {
                clientManager: this.clientManager,
            });

        const fillWatcher =
            config?.fillWatcher ??
            new EventBasedFillWatcher(trackingConfig.fillWatcher, {
                clientManager: this.clientManager,
            });

        return new IntentTracker(this.openWatcher, depositInfoParser, fillWatcher);
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
        depositInfoParser: customDepositInfoParser,
        fillWatcher: customFillWatcher,
        rpcUrls,
    } = config || {};

    const factory = new IntentTrackerFactory({ publicClient, rpcUrls });
    return factory.createTracker(provider, {
        depositInfoParser: customDepositInfoParser,
        fillWatcher: customFillWatcher,
    });
}
