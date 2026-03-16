import type { Address, Hex } from "viem";
import { zeroAddress } from "viem";

import type { OpenedIntent } from "../../../internal.js";
import { OpenedIntentNotFoundError } from "../../../internal.js";
import { RelayIntentStatusResponseSchema } from "../schemas.js";

/**
 * Extract an OpenedIntent from a Relay intent status API response.
 * Throws {@link OpenedIntentNotFoundError} if the response is invalid.
 */
export function extractOpenedIntent(response: unknown, txHash: Hex): OpenedIntent {
    const parsed = RelayIntentStatusResponseSchema.safeParse(response);

    if (!parsed.success) {
        throw new OpenedIntentNotFoundError(txHash, "relay");
    }

    const data = parsed.data;
    const originTxHash = (data.inTxHashes?.[0] as Hex) ?? txHash;

    return {
        user: zeroAddress as Address,
        originChainId: data.originChainId ?? 0,
        openDeadline: 0,
        fillDeadline: 0xffffffff,
        orderId: txHash,
        maxSpent: [],
        minReceived: [],
        fillInstructions: data.destinationChainId
            ? [
                  {
                      destinationChainId: data.destinationChainId,
                      destinationSettler: zeroAddress as Hex,
                      originData: "0x" as Hex,
                  },
              ]
            : [],
        txHash: originTxHash,
        blockNumber: 0n,
        originContract: zeroAddress as Address,
    };
}
