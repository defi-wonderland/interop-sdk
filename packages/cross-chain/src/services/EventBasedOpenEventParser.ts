import { Chain, Hex, PublicClient } from "viem";

import {
    getChainById,
    OpenEvent,
    OpenEventParser,
    OpenEventParserConfig,
    PublicClientManager,
} from "../internal.js";

export class ProtocolOpenEventNotFoundError extends Error {
    constructor(txHash: Hex, protocol: string) {
        super(`${protocol} open event not found in transaction ${txHash}`);
        this.name = "ProtocolOpenEventNotFoundError";
    }
}

export interface EventBasedOpenEventParserDependencies {
    clientManager: PublicClientManager;
}

/**
 * Generic event-based open event parser
 * Can be configured for any protocol that emits open/deposit events
 *
 * This allows protocols that don't emit the standard EIP-7683 Open event
 * to still provide the necessary data for intent tracking.
 */
export class EventBasedOpenEventParser implements OpenEventParser {
    constructor(
        private readonly config: OpenEventParserConfig,
        private readonly dependencies: EventBasedOpenEventParserDependencies,
    ) {}

    private getPublicClient({ chain }: { chain: Chain }): PublicClient {
        return this.dependencies.clientManager.getClient(chain);
    }

    /**
     * Parse open event information from a transaction using configured event signature
     *
     * @param txHash - Transaction hash to parse
     * @param chainId - Chain ID where the transaction occurred
     * @returns Open event data needed for intent tracking
     * @throws {OpenEventNotFoundError} If open event is not found
     */
    async getOpenEvent(txHash: Hex, chainId: number): Promise<OpenEvent> {
        const chain = getChainById(chainId);
        const publicClient = this.getPublicClient({ chain });
        const receipt = await publicClient.getTransactionReceipt({ hash: txHash });

        const openLog = receipt.logs.find((log) => log.topics[0] === this.config.eventSignature);

        if (!openLog) {
            throw new ProtocolOpenEventNotFoundError(txHash, this.config.protocolName);
        }

        return this.config.extractOpenEvent(openLog, txHash, chainId);
    }
}
