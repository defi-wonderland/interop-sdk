import { PublicClient } from "viem";

import {
    AcrossProvider,
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
    const {
        publicClient,
        depositInfoParser: customDepositInfoParser,
        fillWatcher: customFillWatcher,
        rpcUrls,
    } = config || {};

    const clientManager = new PublicClientManager(publicClient, rpcUrls);

    const openWatcher = new OpenEventWatcher({ clientManager });

    let depositInfoParser: DepositInfoParser;
    let fillWatcher: FillWatcher;

    if (customDepositInfoParser) {
        depositInfoParser = customDepositInfoParser;
    } else {
        switch (protocol) {
            case "across": {
                const depositParserConfig = AcrossProvider.getDepositInfoParserConfig();
                depositInfoParser = new EventBasedDepositInfoParser(depositParserConfig, {
                    clientManager,
                });
                break;
            }
            default:
                throw new Error(`Unsupported protocol: ${protocol}`);
        }
    }

    if (customFillWatcher) {
        fillWatcher = customFillWatcher;
    } else {
        switch (protocol) {
            case "across": {
                const fillWatcherConfig = AcrossProvider.getFillWatcherConfig();
                fillWatcher = new EventBasedFillWatcher(fillWatcherConfig, {
                    clientManager,
                });
                break;
            }
            default:
                throw new Error(`Unsupported protocol: ${protocol}`);
        }
    }

    return new IntentTracker(openWatcher, depositInfoParser, fillWatcher);
}
