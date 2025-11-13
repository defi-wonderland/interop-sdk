import { Hex } from "viem";

import { DepositInfo } from "../internal.js";

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
