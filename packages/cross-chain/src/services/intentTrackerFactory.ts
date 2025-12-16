import { PublicClient } from "viem";

import {
    AcrossProvider,
    DepositInfoParser,
    EventBasedDepositInfoParser,
    EventBasedFillWatcher,
    EventBasedOpenEventParser,
    FillWatcher,
    IntentTracker,
    OpenEventParser,
    OpenEventWatcher,
    PublicClientManager,
} from "../internal.js";

export interface IntentTrackerConfig {
    publicClient?: PublicClient;
    openEventParser?: OpenEventParser;
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
        openEventParser: customOpenEventParser,
        depositInfoParser: customDepositInfoParser,
        fillWatcher: customFillWatcher,
        rpcUrls,
    } = config || {};

    const clientManager = new PublicClientManager(publicClient, rpcUrls);

    let openEventParser: OpenEventParser;
    let depositInfoParser: DepositInfoParser;
    let fillWatcher: FillWatcher;

    // Set up open event parser (protocol-specific or EIP-7683 standard)
    if (customOpenEventParser) {
        openEventParser = customOpenEventParser;
    } else {
        switch (protocol) {
            case "across": {
                // Across uses V3FundsDeposited event, not EIP-7683 Open event
                const openParserConfig = AcrossProvider.getOpenEventParserConfig();
                openEventParser = new EventBasedOpenEventParser(openParserConfig, {
                    clientManager,
                });
                break;
            }
            default:
                // Default to EIP-7683 standard Open event parser
                openEventParser = new OpenEventWatcher({ clientManager });
        }
    }

    // Set up deposit info parser
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

    // Set up fill watcher
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

    return new IntentTracker(openEventParser, depositInfoParser, fillWatcher);
}
