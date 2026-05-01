import { Chain, decodeEventLog, Hex, numberToHex, PublicClient } from "viem";

import { addressToBytes32 } from "../../../core/utils/addressHelpers.js";
import {
    getChainById,
    InvalidOpenEventError,
    OIFOpenEventNotFoundError,
    OpenedIntent,
    OpenedIntentParser,
    OpenedIntentParserDependencies,
} from "../../../internal.js";
import { OIF_OPEN_EVENT_ABI, OIF_OPEN_EVENT_SIGNATURE } from "../constants.js";

/**
 * Parser for OIF InputSettlerEscrow Open events.
 *
 * The OIF settler emits `Open(bytes32 orderId, StandardOrder order)` which
 * differs from the ERC-7683 standard event. This parser extracts the
 * StandardOrder fields and maps them to the SDK's OpenedIntent interface.
 */
export class OIFOpenedIntentParser implements OpenedIntentParser {
    constructor(private readonly dependencies: OpenedIntentParserDependencies) {}

    private getPublicClient({ chain }: { chain: Chain }): PublicClient {
        return this.dependencies.clientManager.getClient(chain);
    }

    async getOpenedIntent(txHash: Hex, chainId: number): Promise<OpenedIntent> {
        const chain = getChainById(chainId);
        const publicClient = this.getPublicClient({ chain });

        const receipt = await publicClient.getTransactionReceipt({ hash: txHash });

        const openLog = receipt.logs.find((log) => log.topics[0] === OIF_OPEN_EVENT_SIGNATURE);

        if (!openLog) {
            throw new OIFOpenEventNotFoundError(txHash);
        }

        try {
            const decoded = decodeEventLog({
                abi: OIF_OPEN_EVENT_ABI,
                data: openLog.data,
                topics: openLog.topics,
            });

            const { orderId, order } = decoded.args;

            if (!orderId || !order) {
                throw new InvalidOpenEventError("Missing orderId or order");
            }

            if (!order.inputs || order.inputs.length === 0) {
                throw new InvalidOpenEventError("Missing inputs in Open event");
            }
            if (!order.outputs || order.outputs.length === 0) {
                throw new InvalidOpenEventError("Missing outputs in Open event");
            }

            // Map StandardOrder inputs to TokenTransfer (maxSpent).
            // inputs is uint256[2][] where [0] is token address and [1] is amount.
            const maxSpent = order.inputs.map((input) => ({
                token: numberToHex(input[0], { size: 32 }),
                amount: input[1],
                recipient: addressToBytes32(openLog.address),
                chainId: Number(order.originChainId),
            }));

            // Map MandateOutput to TokenTransfer (minReceived).
            const minReceived = order.outputs.map((output) => ({
                token: output.token,
                amount: output.amount,
                recipient: output.recipient,
                chainId: Number(output.chainId),
            }));

            // Map MandateOutput to FillInstruction.
            const fillInstructions = order.outputs.map((output) => ({
                destinationChainId: Number(output.chainId),
                destinationSettler: output.settler,
                originData: "0x" as Hex,
            }));

            return {
                user: order.user,
                originChainId: Number(order.originChainId),
                openDeadline: order.expires,
                fillDeadline: order.fillDeadline,
                orderId,
                maxSpent,
                minReceived,
                fillInstructions,
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
