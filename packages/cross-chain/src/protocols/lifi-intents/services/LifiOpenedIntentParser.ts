import type { Address } from "viem";
import { Chain, decodeEventLog, Hex, PublicClient, toEventSelector, toHex } from "viem";

import type {
    FillInstruction,
    OpenedIntent,
    OpenedIntentParser,
    OpenedIntentParserDependencies,
    TokenTransfer,
} from "../../../internal.js";
import { bytes32ToAddress, getChainById, OpenedIntentNotFoundError } from "../../../internal.js";

/**
 * LI.FI uses a different Open event signature than the standard ERC-7683.
 * `maxSpent` is encoded as `uint256[2][]` (token packed as uint256, then amount),
 * not as `tuple(address,uint256)[]`.
 */
const LIFI_OPEN_EVENT_ABI = [
    {
        type: "event" as const,
        name: "Open",
        inputs: [
            { indexed: true, name: "orderId", type: "bytes32" as const },
            {
                indexed: false,
                name: "resolvedOrder",
                type: "tuple" as const,
                components: [
                    { name: "user", type: "address" as const },
                    { name: "nonce", type: "uint256" as const },
                    { name: "originChainId", type: "uint256" as const },
                    { name: "openDeadline", type: "uint32" as const },
                    { name: "fillDeadline", type: "uint32" as const },
                    { name: "orderDataType", type: "address" as const },
                    { name: "maxSpent", type: "uint256[2][]" as const },
                    {
                        name: "fillInstructions",
                        type: "tuple[]" as const,
                        components: [
                            { name: "destinationSettler", type: "bytes32" as const },
                            { name: "outputSettler", type: "bytes32" as const },
                            { name: "destinationChainId", type: "uint256" as const },
                            { name: "outputToken", type: "bytes32" as const },
                            { name: "outputAmount", type: "uint256" as const },
                            { name: "filler", type: "bytes32" as const },
                            { name: "originData", type: "bytes" as const },
                            { name: "fillerData", type: "bytes" as const },
                        ],
                    },
                ],
            },
        ],
    },
] as const;

const LIFI_OPEN_EVENT_SIGNATURE = toEventSelector(LIFI_OPEN_EVENT_ABI[0]);

interface LifiResolvedOrder {
    user: Address;
    nonce: bigint;
    originChainId: bigint;
    openDeadline: number;
    fillDeadline: number;
    orderDataType: Address;
    maxSpent: ReadonlyArray<readonly [bigint, bigint]>;
    fillInstructions: ReadonlyArray<{
        destinationSettler: Hex;
        outputSettler: Hex;
        destinationChainId: bigint;
        outputToken: Hex;
        outputAmount: bigint;
        filler: Hex;
        originData: Hex;
        fillerData: Hex;
    }>;
}

/**
 * Parser for LI.FI Intents Open events.
 *
 * LI.FI emits an Open event with a different ResolvedCrossChainOrder struct
 * than the standard ERC-7683 layout. This parser handles the decoding and
 * maps the result to the SDK's OpenedIntent type.
 */
export class LifiOpenedIntentParser implements OpenedIntentParser {
    constructor(private readonly dependencies: OpenedIntentParserDependencies) {}

    private getPublicClient({ chain }: { chain: Chain }): PublicClient {
        return this.dependencies.clientManager.getClient(chain);
    }

    async getOpenedIntent(txHash: Hex, chainId: number): Promise<OpenedIntent> {
        const chain = getChainById(chainId);
        const publicClient = this.getPublicClient({ chain });
        const receipt = await publicClient.getTransactionReceipt({ hash: txHash });

        const openLog = receipt.logs.find((log) => log.topics[0] === LIFI_OPEN_EVENT_SIGNATURE);

        if (!openLog) {
            throw new OpenedIntentNotFoundError(txHash, "lifi-intents");
        }

        const decoded = decodeEventLog({
            abi: LIFI_OPEN_EVENT_ABI,
            data: openLog.data,
            topics: openLog.topics,
        });

        const { orderId, resolvedOrder } = decoded.args as unknown as {
            orderId: Hex;
            resolvedOrder: LifiResolvedOrder;
        };

        const originChainId = Number(resolvedOrder.originChainId);

        const maxSpent: TokenTransfer[] = resolvedOrder.maxSpent.map(([tokenAsUint, amount]) => ({
            // toHex throws if tokenAsUint exceeds 20 bytes — surface unexpected encoding loudly.
            token: toHex(tokenAsUint, { size: 20 }) as Address,
            amount,
            recipient: openLog.address as Hex,
            chainId: originChainId,
        }));

        const minReceived: TokenTransfer[] = [];
        const fillInstructions: FillInstruction[] = [];

        for (const fi of resolvedOrder.fillInstructions) {
            const destChainId = Number(fi.destinationChainId);

            minReceived.push({
                token: bytes32ToAddress(fi.outputToken),
                amount: fi.outputAmount,
                recipient: bytes32ToAddress(fi.filler),
                chainId: destChainId,
            });

            fillInstructions.push({
                destinationChainId: destChainId,
                destinationSettler: fi.destinationSettler,
                originData: fi.originData,
            });
        }

        return {
            user: resolvedOrder.user,
            originChainId,
            openDeadline: resolvedOrder.openDeadline,
            fillDeadline: resolvedOrder.fillDeadline,
            orderId,
            maxSpent,
            minReceived,
            fillInstructions,
            txHash,
            blockNumber: receipt.blockNumber,
            originContract: openLog.address,
        };
    }
}
