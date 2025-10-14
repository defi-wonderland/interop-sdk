import { Chain, createPublicClient, Hex, http, Log, PublicClient } from "viem";

import {
    DEFAULT_PUBLIC_RPC_URLS,
    DepositInfo,
    DepositInfoParser,
    getChainById,
} from "../internal.js";

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
    publicClient?: PublicClient;
    rpcUrls?: Record<number, string>;
}

/**
 * Generic event-based deposit info parser
 * Can be configured for any protocol that emits deposit events
 */
export class EventBasedDepositInfoParser implements DepositInfoParser {
    private readonly clientCache: Map<number, PublicClient> = new Map();

    constructor(
        private readonly config: DepositInfoParserConfig,
        private readonly dependencies?: EventBasedDepositInfoParserDependencies,
    ) {}

    private getPublicClient({ chain }: { chain: Chain }): PublicClient {
        if (this.dependencies?.publicClient) {
            return this.dependencies.publicClient;
        }

        if (this.clientCache.has(chain.id)) {
            return this.clientCache.get(chain.id)!;
        }

        const rpcUrl = this.dependencies?.rpcUrls?.[chain.id] || DEFAULT_PUBLIC_RPC_URLS[chain.id];

        const client = createPublicClient({
            chain,
            transport: http(rpcUrl),
        });

        this.clientCache.set(chain.id, client);
        return client;
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
