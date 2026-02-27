/**
 * Relay Protocol API Type Definitions
 * Types for interacting with Relay Protocol's REST API
 * @see https://docs.relay.link/
 */

/** Possible statuses returned by Relay's /intents/status/v3 endpoint */
export type RelayIntentStatus =
    | "waiting"
    | "pending"
    | "submitted"
    | "success"
    | "delayed"
    | "refunded"
    | "failure"
    | "refund";

/**
 * Relay Intent Status Response
 * From: GET https://api.relay.link/intents/status/v3
 * @see https://docs.relay.link/references/api/get-intent-status-v2
 */
export interface RelayIntentStatusResponse {
    /** Intent status */
    status: RelayIntentStatus;
    /** Status details */
    details?: Record<string, unknown>;
    /** Origin transaction hashes */
    inTxHashes?: string[];
    /** Destination transaction hashes */
    txHashes?: string[];
    /** Last updated timestamp */
    updatedAt?: string;
    /** Origin chain ID */
    originChainId?: number;
    /** Destination chain ID */
    destinationChainId?: number;
}

/**
 * Extended metadata for Relay API responses
 * Captures tracking data beyond basic FillEvent
 */
export interface RelayMetadata {
    /** Relay request ID for tracking */
    requestId?: string;
    /** Origin transaction hashes */
    inTxHashes?: string[];
    /** Destination transaction hashes */
    txHashes?: string[];
}
