import { Chain, decodeEventLog, Hex, PublicClient } from "viem";

import {
    EIP7683ResolvedOrder,
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
 * Parser for OIF (Open Intent Framework) standard Open events.
 * For protocols that emit the standard ERC-7683 Open event.
 *
 * Extracts the complete ERC-7683 ResolvedCrossChainOrder struct including:
 * - All fields from the spec (user, originChainId, openDeadline, fillDeadline, orderId)
 * - Full arrays: maxSpent[], minReceived[], fillInstructions[]
 * - SDK metadata: txHash, blockNumber, originContract
 *
 * Fully supports multi-token and multi-chain intents as defined in ERC-7683.
 *
 * @see https://www.erc7683.org/spec
 */
export class OIFOpenedIntentParser implements OpenedIntentParser {
    constructor(private readonly dependencies: OpenedIntentParserDependencies) {}

    private getPublicClient({ chain }: { chain: Chain }): PublicClient {
        return this.dependencies.clientManager.getClient(chain);
    }

    /**
     * Parse OIF Open event from a transaction and return OpenedIntent.
     *
     * Extracts the complete ERC-7683 ResolvedCrossChainOrder struct from the Open event,
     * including all arrays (maxSpent, minReceived, fillInstructions) for full multi-token
     * and multi-chain support.
     *
     * @param txHash - Transaction hash to parse
     * @param chainId - Chain ID where the transaction occurred
     * @returns Complete opened intent data matching ERC-7683 spec
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

            const { orderId, resolvedOrder } = decoded.args as {
                orderId: Hex;
                resolvedOrder: EIP7683ResolvedOrder;
            };

            if (!orderId || !resolvedOrder) {
                throw new InvalidOpenEventError("Missing orderId or resolvedOrder");
            }

            if (!resolvedOrder.maxSpent || resolvedOrder.maxSpent.length === 0) {
                throw new InvalidOpenEventError("Missing maxSpent in Open event");
            }
            if (!resolvedOrder.minReceived || resolvedOrder.minReceived.length === 0) {
                throw new InvalidOpenEventError("Missing minReceived in Open event");
            }
            if (!resolvedOrder.fillInstructions || resolvedOrder.fillInstructions.length === 0) {
                throw new InvalidOpenEventError("Missing fillInstructions in Open event");
            }

            const maxSpent = resolvedOrder.maxSpent.map((output) => ({
                ...output,
                chainId: Number(output.chainId),
            }));
            const minReceived = resolvedOrder.minReceived.map((output) => ({
                ...output,
                chainId: Number(output.chainId),
            }));
            const fillInstructions = resolvedOrder.fillInstructions.map((instruction) => ({
                ...instruction,
                destinationChainId: Number(instruction.destinationChainId),
            }));

            return {
                // ERC-7683 ResolvedCrossChainOrder fields
                user: resolvedOrder.user,
                originChainId: Number(resolvedOrder.originChainId),
                openDeadline: resolvedOrder.openDeadline,
                fillDeadline: resolvedOrder.fillDeadline,
                orderId,
                maxSpent,
                minReceived,
                fillInstructions,
                // SDK metadata fields
                txHash,
                blockNumber: receipt.blockNumber,
                originContract: openLog.address,
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
