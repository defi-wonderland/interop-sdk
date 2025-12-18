import { Hex, Log } from "viem";

import type { OpenedIntent, PublicClientManager } from "../internal.js";

/**
 * Interface for parsing opened intent information from a transaction.
 * Implementations can parse from different sources (OIF events, custom events, APIs).
 *
 * All parsers return the full {@link OpenedIntent} type with complete data including
 * destination chain and amounts, as this data is available from the EIP-7683 Open event.
 */
export interface OpenedIntentParser {
    /**
     * Parse opened intent information from a transaction
     *
     * @param txHash - Transaction hash to parse
     * @param chainId - Chain ID where the transaction occurred
     * @returns Complete opened intent data needed for tracking
     * @throws {OpenedIntentNotFoundError} If opened intent is not found
     */
    getOpenedIntent(txHash: Hex, chainId: number): Promise<OpenedIntent>;
}

/**
 * Dependencies for opened intent parsers
 */
export interface OpenedIntentParserDependencies {
    clientManager: PublicClientManager;
}

/**
 * Configuration for custom event-based opened intent parsing.
 * Allows protocols to define how to extract OpenedIntent data from their own events.
 *
 * Custom events MUST provide the full {@link OpenedIntent} including:
 * - destinationChainId
 * - inputAmount
 * - outputAmount
 */
export interface CustomEventOpenedIntentParserConfig {
    /** Protocol name for error messages */
    protocolName: string;
    /** Event signature (topic[0]) to identify the open/deposit event */
    eventSignature: Hex;
    /**
     * Function to extract OpenedIntent data from the matched log.
     * MUST return the full OpenedIntent with all protocol-specific fields.
     */
    extractOpenedIntent: (log: Log, txHash: Hex, blockNumber: bigint) => OpenedIntent;
}

/**
 * Configuration for API-based opened intent parsing (future)
 */
export interface APIOpenedIntentParserConfig {
    /** Protocol name for error messages */
    protocolName: string;
    /** API endpoint URL */
    endpoint: string;
    /** Function to extract OpenedIntent from API response */
    extractOpenedIntent: (response: unknown, txHash: Hex) => OpenedIntent;
}

/**
 * Discriminated union for OpenedIntentParser configuration
 * Used by CrossChainProvider.getTrackingConfig() to specify parsing method
 */
export type OpenedIntentParserConfig =
    | { type: "oif" }
    | { type: "custom-event"; config: CustomEventOpenedIntentParserConfig }
    | { type: "api"; config: APIOpenedIntentParserConfig };
