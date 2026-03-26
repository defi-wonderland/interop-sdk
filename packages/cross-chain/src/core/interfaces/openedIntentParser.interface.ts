import { Hex, Log } from "viem";

import type { OpenedIntent } from "../types/orderTracking.js";
import type { PublicClientManager } from "../utils/publicClientManager.js";

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
 * Custom events MUST provide the full {@link OpenedIntent} matching ERC-7683 ResolvedCrossChainOrder structure.
 */
export interface CustomEventOpenedIntentParserConfig {
    /** Protocol name for error messages */
    protocolName: string;
    /** Event signature (topic[0]) to identify the open/deposit event */
    eventSignature: Hex;
    /**
     * Function to extract OpenedIntent data from the matched log.
     * MUST return the full OpenedIntent with all ERC-7683 ResolvedCrossChainOrder fields.
     *
     * @param log - The event log to parse
     * @param txHash - Transaction hash where the event was emitted
     * @param blockNumber - Block number where the event was emitted
     * @param originChainId - Chain ID where the event was emitted (for constructing maxSpent/fillInstructions)
     */
    extractOpenedIntent: (
        log: Log,
        txHash: Hex,
        blockNumber: bigint,
        originChainId: number,
    ) => OpenedIntent;
}

/**
 * Configuration for API-based opened intent parsing.
 * Allows protocols to define how to fetch and extract OpenedIntent data from their own APIs.
 *
 * @typeParam TResponse - Expected shape of the API response for type-safe extraction
 */
export interface APIOpenedIntentParserConfig<TResponse = unknown> {
    /** Protocol name for error messages */
    protocolName: string;
    /** Optional custom headers (e.g. for authentication) */
    headers?: Record<string, string>;
    /**
     * Build the full URL to fetch intent data.
     * @param txHash - Transaction hash to look up
     * @param chainId - Chain ID where the transaction occurred
     * @example (txHash) => `https://api.relay.link/intents/status/v3?requestId=${txHash}`
     */
    buildUrl: (txHash: Hex, chainId: number) => string;
    /**
     * Extract and validate OpenedIntent from API response.
     * Should throw {@link OpenedIntentNotFoundError} if the response does not contain valid data.
     */
    extractOpenedIntent: (response: TResponse, txHash: Hex) => OpenedIntent;
}

/**
 * Discriminated union for OpenedIntentParser configuration
 * Used by CrossChainProvider.getTrackingConfig() to specify parsing method
 */
export type OpenedIntentParserConfig =
    | { type: "oif" }
    | { type: "custom-event"; config: CustomEventOpenedIntentParserConfig }
    | { type: "api"; config: APIOpenedIntentParserConfig };
