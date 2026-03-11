import type { Address, Hex } from "viem";
import { zeroAddress } from "viem";

import type { FillEvent, GetFillParams, OpenedIntent } from "../../../internal.js";
import type { RelayIntentStatusResponse } from "../schemas.js";
import { OpenedIntentNotFoundError, OrderFailureReason, OrderStatus } from "../../../internal.js";
import { RelayIntentStatusResponseSchema } from "../schemas.js";

/** Maps Relay intent status strings to SDK OrderStatus values. */
export const RELAY_STATUS_MAP: Record<
    string,
    { status: OrderStatus; failureReason?: OrderFailureReason }
> = {
    waiting: { status: OrderStatus.Pending },
    pending: { status: OrderStatus.Executing },
    submitted: { status: OrderStatus.Settling },
    success: { status: OrderStatus.Finalized },
    failure: { status: OrderStatus.Failed, failureReason: OrderFailureReason.Unknown },
    refund: { status: OrderStatus.Refunded },
};

/**
 * Extract a fill event from a Relay intent status response.
 * Returns status, optional failureReason, fillTxHash, and a FillEvent when finalized.
 */
export function extractFillEvent(
    response: RelayIntentStatusResponse,
    params: GetFillParams,
): {
    event: FillEvent | null;
    status: OrderStatus;
    failureReason?: OrderFailureReason;
    fillTxHash?: string;
} {
    const { status, failureReason } = RELAY_STATUS_MAP[response.status] ?? {
        status: OrderStatus.Pending,
    };

    const fillTxHash = response.txHashes?.[0] as Hex | undefined;
    const base = { event: null, status, failureReason, fillTxHash };

    if (status !== OrderStatus.Finalized || !fillTxHash) {
        return { ...base, event: null };
    }

    return {
        event: {
            fillTxHash,
            blockNumber: 0n,
            timestamp: response.updatedAt ?? 0,
            originChainId: params.originChainId,
            orderId: params.orderId,
            relayer: zeroAddress,
            recipient: zeroAddress,
        },
        status,
        failureReason,
    };
}

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
        fillDeadline: 0,
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
