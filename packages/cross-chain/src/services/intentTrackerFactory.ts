import { PublicClient } from "viem";

import { AcrossFillWatcher, FillWatcher, IntentTracker, OpenEventWatcher } from "../internal.js";

export interface IntentTrackerConfig {
    publicClient?: PublicClient;
    fillWatcher?: FillWatcher;
    rpcUrls?: {
        [chainId: number]: string;
    };
}

/**
 * Create an intent tracker for a specific protocol
 * It automatically wires up the correct components for the specified protocol.
 *
 * @param protocol - Protocol to track intents for (currently only "across" is supported)
 * @param config - Optional configuration
 * @returns Configured IntentTracker instance
 *
 * @example
 * ```typescript
 * const tracker = createIntentTracker("across");
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
    protocol: "across",
    config?: IntentTrackerConfig,
): IntentTracker {
    const { publicClient, fillWatcher: customFillWatcher, rpcUrls } = config || {};

    const openWatcher = new OpenEventWatcher({
        publicClient,
        rpcUrls,
    });

    let fillWatcher: FillWatcher;

    if (customFillWatcher) {
        fillWatcher = customFillWatcher;
    } else {
        switch (protocol) {
            case "across":
                fillWatcher = new AcrossFillWatcher({
                    publicClient,
                    rpcUrls,
                });
                break;
            default:
                throw new Error(`Unsupported protocol: ${protocol}`);
        }
    }

    return new IntentTracker(openWatcher, fillWatcher);
}
