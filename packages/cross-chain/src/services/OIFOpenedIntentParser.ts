import { Chain, decodeEventLog, Hex, PublicClient } from "viem";

import {
    getChainById,
    InvalidOpenEventError,
    OIFOpenEventNotFoundError,
    OPEN_EVENT_ABI,
    OPEN_EVENT_SIGNATURE,
    OpenedIntent,
    OpenedIntentParser,
    OpenedIntentParserDependencies,
} from "../internal.js";

/**
 * Parser for OIF (Open Intent Framework) standard Open events
 * For protocols that emit the standard EIP-7683 Open event
 *
 * NOTE: The OIF Open event doesn't contain all protocol-specific data
 * (like inputAmount, outputAmount). For protocols with custom events,
 * use CustomEventOpenedIntentParser instead.
 */
export class OIFOpenedIntentParser implements OpenedIntentParser {
    constructor(private readonly dependencies: OpenedIntentParserDependencies) {}

    private getPublicClient({ chain }: { chain: Chain }): PublicClient {
        return this.dependencies.clientManager.getClient(chain);
    }

    /**
     * Parse OIF Open event from a transaction and return OpenedIntent
     *
     * @param txHash - Transaction hash to parse
     * @param chainId - Chain ID where the transaction occurred
     * @returns Opened intent data
     * @throws {OIFOpenEventNotFoundError} If Open event is not found
     * @throws {InvalidOpenEventError} If Open event data is malformed
     */
    async getOpenedIntent(txHash: Hex, chainId: number): Promise<OpenedIntent> {
        const chain = getChainById(chainId);
        const publicClient = this.getPublicClient({ chain });

        const receipt = await publicClient.getTransactionReceipt({ hash: txHash });

        const openLog = receipt.logs.find((log) => log.topics[0] === OPEN_EVENT_SIGNATURE);

        if (!openLog) {
            throw new OIFOpenEventNotFoundError(txHash);
        }

        try {
            const decoded = decodeEventLog({
                abi: OPEN_EVENT_ABI,
                data: openLog.data,
                topics: openLog.topics,
            });

            const { orderId, resolvedOrder } = decoded.args;

            if (!orderId || !resolvedOrder) {
                throw new InvalidOpenEventError("Missing orderId or resolvedOrder");
            }

            // Convert orderId bytes32 to bigint for depositId
            const depositId = BigInt(orderId);

            return {
                orderId,
                txHash,
                blockNumber: receipt.blockNumber,
                originContract: openLog.address,
                user: resolvedOrder.user,
                fillDeadline: resolvedOrder.fillDeadline,
                depositId,
                // OIF Open event doesn't specify destination chain directly
                // Use originChainId as fallback (protocols should use CustomEventOpenedIntentParser for proper handling)
                destinationChainId: resolvedOrder.originChainId,
                // These amounts are not available in the basic Open event
                // For real values, protocols should use CustomEventOpenedIntentParser
                inputAmount: 0n,
                outputAmount: 0n,
            };
        } catch (error) {
            if (
                error instanceof InvalidOpenEventError ||
                error instanceof OIFOpenEventNotFoundError
            ) {
                throw error;
            }
            throw new InvalidOpenEventError(
                error instanceof Error ? error.message : "Unknown error decoding event",
            );
        }
    }
}
