import type { PublicClient } from "viem";

import type { FillWatcher } from "./fillWatcher.interface.js";
import type { OpenedIntentParser } from "./openedIntentParser.interface.js";
import type { PreTracker } from "./preTracker.interface.js";

/**
 * Configuration for OrderTrackerFactory
 */
export interface OrderTrackerFactoryConfig {
    publicClient?: PublicClient;
    rpcUrls?: Record<number, string>;
}

/**
 * Configuration for creating an OrderTracker
 */
export interface OrderTrackerConfig extends OrderTrackerFactoryConfig {
    openedIntentParser?: OpenedIntentParser;
    fillWatcher?: FillWatcher;
    preTracker?: PreTracker;
}
