import { Hex } from "viem";

import { DepositInfo } from "../internal.js";

/**
 * Interface for protocol-specific deposit info parsers
 * Each protocol implements this to extract deposit information from transactions
 *
 * Different protocols may:
 * - Use different event signatures
 * - Store different data in their events
 * - Have different ways to identify deposits
 *
 * This interface abstracts those differences
 */
export interface DepositInfoParser {
    /**
     * Parse protocol-specific deposit information from a transaction
     *
     * @param txHash - Transaction hash to parse
     * @param chainId - Chain ID where the transaction occurred
     * @returns Deposit information needed for fill matching
     * @throws {DepositEventNotFoundError} If deposit event is not found in transaction
     */
    getDepositInfo(txHash: Hex, chainId: number): Promise<DepositInfo>;
}
