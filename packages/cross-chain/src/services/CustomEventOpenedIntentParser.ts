import { Chain, Hex, PublicClient } from "viem";

import {
    CustomEventOpenedIntentParserConfig,
    getChainById,
    OpenedIntent,
    OpenedIntentNotFoundError,
    OpenedIntentParser,
    OpenedIntentParserDependencies,
} from "../internal.js";

/**
 * Generic custom event-based opened intent parser
 * Can be configured for any protocol that emits protocol-specific open/deposit events
 *
 * This allows protocols that don't emit the standard OIF Open event
 * to still provide the necessary data for intent tracking.
 */
export class CustomEventOpenedIntentParser implements OpenedIntentParser {
    constructor(
        private readonly config: CustomEventOpenedIntentParserConfig,
        private readonly dependencies: OpenedIntentParserDependencies,
    ) {}

    private getPublicClient({ chain }: { chain: Chain }): PublicClient {
        return this.dependencies.clientManager.getClient(chain);
    }

    /**
     * Parse opened intent information from a transaction using configured event signature
     *
     * @param txHash - Transaction hash to parse
     * @param chainId - Chain ID where the transaction occurred
     * @returns Opened intent data needed for tracking
     * @throws {OpenedIntentNotFoundError} If opened intent event is not found
     */
    async getOpenedIntent(txHash: Hex, chainId: number): Promise<OpenedIntent> {
        const chain = getChainById(chainId);
        const publicClient = this.getPublicClient({ chain });
        const receipt = await publicClient.getTransactionReceipt({ hash: txHash });

        const openLog = receipt.logs.find((log) => log.topics[0] === this.config.eventSignature);

        if (!openLog) {
            throw new OpenedIntentNotFoundError(txHash, this.config.protocolName);
        }

        return this.config.extractOpenedIntent(openLog, txHash, receipt.blockNumber);
    }
}
