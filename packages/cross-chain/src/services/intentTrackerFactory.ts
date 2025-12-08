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

export interface IntentTrackerConfig {
    publicClient?: PublicClient;
    depositInfoParser?: DepositInfoParser;
    fillWatcher?: FillWatcher;
    rpcUrls?: {
        [chainId: number]: string;
    };
}

/**
 * Create an intent tracker for a provider (advanced use case)
 * Uses the provider's getTrackingConfig() method to get protocol-specific configuration.
 *
 * NOTE: Most users should use ProviderExecutor's prepareTracking() or track() methods instead.
 * This factory is for advanced scenarios where you need direct tracker creation without an executor.
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

    const clientManager = new PublicClientManager(publicClient, rpcUrls);
    const openWatcher = new OpenEventWatcher({ clientManager });

    // Use custom implementations if provided, otherwise use provider's config
    const depositInfoParser =
        customDepositInfoParser ||
        new EventBasedDepositInfoParser(provider.getTrackingConfig().depositInfoParser, {
            clientManager,
        });

    const fillWatcher =
        customFillWatcher ||
        new EventBasedFillWatcher(provider.getTrackingConfig().fillWatcher, {
            clientManager,
        });

    return new IntentTracker(openWatcher, depositInfoParser, fillWatcher);
}
