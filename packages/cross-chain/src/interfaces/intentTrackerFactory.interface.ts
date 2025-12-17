import type { PublicClient } from "viem";

import type { FillWatcher, OpenedIntentParser } from "../internal.js";

/**
 * Configuration for IntentTrackerFactory
 */
export interface IntentTrackerFactoryConfig {
    publicClient?: PublicClient;
    rpcUrls?: Record<number, string>;
}

/**
 * Configuration for creating an IntentTracker
 */
export interface IntentTrackerConfig extends IntentTrackerFactoryConfig {
    openedIntentParser?: OpenedIntentParser;
    fillWatcher?: FillWatcher;
}
