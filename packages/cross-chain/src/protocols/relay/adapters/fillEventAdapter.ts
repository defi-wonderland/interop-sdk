import type { Hex } from "viem";
import { zeroAddress } from "viem";

import type { FillEvent, GetFillParams } from "../../../internal.js";
import type { RelayIntentStatusResponse } from "../schemas.js";
import { OrderFailureReason, OrderStatus } from "../../../internal.js";

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
