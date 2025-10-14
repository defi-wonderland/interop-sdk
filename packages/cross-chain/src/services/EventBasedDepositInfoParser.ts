import { Chain, Hex, Log, PublicClient } from "viem";

import { DepositInfo, DepositInfoParser, getChainById, PublicClientManager } from "../internal.js";

export class DepositEventNotFoundError extends Error {
    constructor(txHash: Hex, protocol: string) {
        super(`${protocol} deposit event not found in transaction ${txHash}`);
        this.name = "DepositEventNotFoundError";
    }
}

export interface DepositInfoParserConfig {
    /** Protocol name for error messages */
    protocolName: string;
    /** Event signature (topic[0]) to identify the deposit event */
    eventSignature: Hex;
    /** Function to extract DepositInfo from the matched log */
    extractDepositInfo: (log: Log) => DepositInfo;
}

export interface EventBasedDepositInfoParserDependencies {
    clientManager: PublicClientManager;
}

/**
 * Generic event-based deposit info parser
 * Can be configured for any protocol that emits deposit events
 */
export class EventBasedDepositInfoParser implements DepositInfoParser {
    constructor(
        private readonly config: DepositInfoParserConfig,
        private readonly dependencies: EventBasedDepositInfoParserDependencies,
    ) {}

    private getPublicClient({ chain }: { chain: Chain }): PublicClient {
        return this.dependencies.clientManager.getClient(chain);
    }

    /**
     * Parse deposit information from a transaction using configured event signature
     *
     * @param txHash - Transaction hash to parse
     * @param chainId - Chain ID where the transaction occurred
     * @returns Deposit information needed for fill matching
     * @throws {DepositEventNotFoundError} If deposit event is not found
     */
    async getDepositInfo(txHash: Hex, chainId: number): Promise<DepositInfo> {
        const chain = getChainById(chainId);
        const publicClient = this.getPublicClient({ chain });
        const receipt = await publicClient.getTransactionReceipt({ hash: txHash });

        const depositLog = receipt.logs.find((log) => log.topics[0] === this.config.eventSignature);

        if (!depositLog) {
            throw new DepositEventNotFoundError(txHash, this.config.protocolName);
        }

        return this.config.extractDepositInfo(depositLog);
    }
}
