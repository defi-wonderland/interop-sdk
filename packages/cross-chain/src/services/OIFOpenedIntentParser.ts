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
 * For protocols that emit the standard EIP-7683 Open event.
 *
 * Extracts data from the EIP-7683 ResolvedCrossChainOrder struct:
 * - destinationChainId from fillInstructions[0]
 * - inputAmount from maxSpent[0] (first input token)
 * - outputAmount from minReceived[0] (first output token)
 *
 * NOTE: This implementation currently supports single-token intents only.
 * EIP-7683 allows multi-token intents (multiple entries in maxSpent/minReceived),
 * but this parser only extracts the first token from each array.
 *
 * @see https://eips.ethereum.org/EIPS/eip-7683
 */
export class OIFOpenedIntentParser implements OpenedIntentParser {
    constructor(private readonly dependencies: OpenedIntentParserDependencies) {}

    private getPublicClient({ chain }: { chain: Chain }): PublicClient {
        return this.dependencies.clientManager.getClient(chain);
    }

    /**
     * Parse OIF Open event from a transaction and return OpenedIntent.
     *
     * Extracts the full intent data from the EIP-7683 Open event including
     * destination chain, input amounts, and output amounts.
     *
     * @param txHash - Transaction hash to parse
     * @param chainId - Chain ID where the transaction occurred
     * @returns Complete opened intent data
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

            // Validate fillInstructions exist for destination chain
            const firstFillInstruction = resolvedOrder.fillInstructions?.[0];
            if (!firstFillInstruction) {
                throw new InvalidOpenEventError("Missing fillInstructions in Open event");
            }

            // Extract destination chain from first fill instruction
            // TODO: Multi-token support - handle multiple fill instructions for different destination chains
            const destinationChainId = firstFillInstruction.destinationChainId;

            // Extract input amount from first maxSpent entry (what user is spending)
            // TODO: Multi-token support - EIP-7683 allows multiple input tokens in maxSpent[].
            //       Current implementation only uses the first token. For multi-token intents,
            //       consider returning the full array or a structured object with per-token amounts.
            const firstInput = resolvedOrder.maxSpent?.[0];
            if (!firstInput) {
                throw new InvalidOpenEventError("Missing maxSpent in Open event");
            }
            const inputAmount = firstInput.amount;

            // Extract output amount from first minReceived entry (what user will receive)
            // TODO: Multi-token support - EIP-7683 allows multiple output tokens in minReceived[].
            //       Current implementation only uses the first token. For multi-token intents,
            //       consider returning the full array or a structured object with per-token amounts.
            const firstOutput = resolvedOrder.minReceived?.[0];
            if (!firstOutput) {
                throw new InvalidOpenEventError("Missing minReceived in Open event");
            }
            const outputAmount = firstOutput.amount;

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
                destinationChainId,
                inputAmount,
                outputAmount,
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
