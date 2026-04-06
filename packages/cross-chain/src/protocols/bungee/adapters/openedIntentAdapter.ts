import type { Address, Hex } from "viem";
import { zeroAddress } from "viem";

import type { OpenedIntent } from "../../../internal.js";
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
    const originChainId = entry.originData.originChainId;
    const destinationChainId = entry.destinationData.destinationChainId;

    return {
        user: zeroAddress as Address,
        originChainId,
        openDeadline: 0,
        fillDeadline: 0xffffffff,
        orderId: entry.hash as Hex,
        maxSpent: [],
        minReceived: [],
        fillInstructions: [
            {
                destinationChainId,
                destinationSettler: zeroAddress as Hex,
                originData: "0x" as Hex,
            },
        ],
        txHash,
        blockNumber: 0n,
        originContract: zeroAddress as Address,
    };
}
