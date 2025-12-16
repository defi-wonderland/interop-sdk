import { Hex, Log } from "viem";

import { OpenEvent } from "../internal.js";

export interface OpenEventParser {
    /**
     * Parse open event information from a transaction
     *
     * @param txHash - Transaction hash to parse
     * @param chainId - Chain ID where the transaction occurred
     * @returns Open event data needed for intent tracking
     * @throws {OpenEventNotFoundError} If open event is not found in transaction
     */
    getOpenEvent(txHash: Hex, chainId: number): Promise<OpenEvent>;
}

/**
 * Configuration for protocol-specific open event parsing
 * Allows protocols to define how to extract OpenEvent data from their own events
 */
export interface OpenEventParserConfig {
    /** Protocol name for error messages */
    protocolName: string;
    /** Event signature (topic[0]) to identify the open/deposit event */
    eventSignature: Hex;
    /** Function to extract OpenEvent data from the matched log */
    extractOpenEvent: (log: Log, txHash: Hex, chainId: number) => OpenEvent;
}
