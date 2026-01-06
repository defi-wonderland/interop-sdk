import type { IntentUpdate } from "../internal.js";

/**
 * Event map for IntentTracker events
 */
export interface IntentTrackerEvents {
    opening: (update: IntentUpdate) => void;
    opened: (update: IntentUpdate) => void;
    filling: (update: IntentUpdate) => void;
    filled: (update: IntentUpdate) => void;
    expired: (update: IntentUpdate) => void;
    error: (error: Error) => void;
}
