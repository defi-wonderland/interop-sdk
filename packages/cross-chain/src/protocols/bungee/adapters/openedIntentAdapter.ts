import type { Address, Hex } from "viem";
import { zeroAddress } from "viem";

import type { OpenedIntent, TokenTransfer } from "../../../internal.js";
import type { BungeeDestinationData, BungeeOriginData } from "../schemas.js";
import { OpenedIntentNotFoundError } from "../../../internal.js";
import { BungeeStatusResponseSchema } from "../schemas.js";

/**
 * Extract an OpenedIntent from a Bungee status API response.
 * Throws {@link OpenedIntentNotFoundError} if the response is invalid or empty.
 */
export function extractOpenedIntent(response: unknown, txHash: Hex): OpenedIntent {
    const parsed = BungeeStatusResponseSchema.safeParse(response);

    if (!parsed.success || parsed.data.result.length === 0) {
        throw new OpenedIntentNotFoundError(txHash, "bungee");
    }

    const entry = parsed.data.result[0]!;
    const { originData, destinationData } = entry;

    return {
        user: originData.userAddress as Address,
        originChainId: originData.originChainId,
        openDeadline: originData.timestamp ?? 0,
        fillDeadline: destinationData.timestamp ?? 0xffffffff,
        orderId: entry.hash as Hex,
        maxSpent: buildMaxSpent(originData),
        minReceived: buildMinReceived(destinationData),
        fillInstructions: [
            {
                destinationChainId: destinationData.destinationChainId,
                destinationSettler: zeroAddress as Hex,
                originData: "0x" as Hex,
            },
        ],
        txHash,
        blockNumber: 0n,
        originContract: zeroAddress as Address,
    };
}

function buildMaxSpent(originData: BungeeOriginData): TokenTransfer[] {
    return originData.input.map((input) => ({
        token: input.token.address as Hex,
        amount: BigInt(input.amount),
        recipient: originData.userAddress as Hex,
        chainId: originData.originChainId,
    }));
}

function buildMinReceived(destinationData: BungeeDestinationData): TokenTransfer[] {
    if (!destinationData.output) return [];

    return destinationData.output.map((output) => ({
        token: output.token.address as Hex,
        amount: BigInt(output.amount),
        recipient: destinationData.receiverAddress as Hex,
        chainId: destinationData.destinationChainId,
    }));
}
