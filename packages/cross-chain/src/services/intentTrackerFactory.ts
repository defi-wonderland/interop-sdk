import { PublicClient } from "viem";

import { AcrossFillWatcher, FillWatcher, IntentTracker, OpenEventWatcher } from "../internal.js";

/**
 * Configuration for IntentTracker
 */
export interface IntentTrackerConfig {
    /** Optional public client to use for RPC calls */
    publicClient?: PublicClient;
    /** Custom fill watcher (advanced usage) */
    fillWatcher?: FillWatcher;
    /** RPC URLs for different chains (fallback if publicClient not provided) */
    rpcUrls?: {
        [chainId: number]: string;
    };
}

/**
 * Create an intent tracker for a specific protocol
 *
 * This is the main entry point for intent tracking functionality.
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
    const { publicClient, fillWatcher: customFillWatcher } = config || {};

    // Create open event watcher (protocol-agnostic)
    const openWatcher = new OpenEventWatcher(publicClient ? { publicClient } : undefined);

    // Get or create fill watcher
    let fillWatcher: FillWatcher;

    if (customFillWatcher) {
        // Use custom fill watcher if provided
        fillWatcher = customFillWatcher;
    } else {
        // Create protocol-specific fill watcher
        switch (protocol) {
            case "across":
                // Pass rpcUrls to AcrossFillWatcher if provided
                // TODO: Actually pass rpcUrls to AcrossFillWatcher constructor
                fillWatcher = new AcrossFillWatcher(publicClient ? { publicClient } : undefined);
                break;
            default:
                throw new Error(`Unsupported protocol: ${protocol}`);
        }
    }

    // Create and return the unified tracker
    return new IntentTracker(openWatcher, fillWatcher);
}
