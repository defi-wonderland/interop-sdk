import type { Hex } from "viem";
import { zeroAddress } from "viem";

import type { FillEvent, GetFillParams } from "../../../internal.js";
import type { BungeeStatusResponse } from "../schemas.js";
import { OrderFailureReason, OrderStatus } from "../../../internal.js";

/** Maps Bungee status codes to SDK OrderStatus values. */
export const BUNGEE_STATUS_MAP: Record<
    number,
    { status: OrderStatus; failureReason?: OrderFailureReason }
> = {
    0: { status: OrderStatus.Pending },
    1: { status: OrderStatus.Executing },
    2: { status: OrderStatus.Executing },
    3: { status: OrderStatus.Finalized },
    4: { status: OrderStatus.Finalized },
    5: { status: OrderStatus.Failed, failureReason: OrderFailureReason.DeadlineExceeded },
    6: { status: OrderStatus.Failed, failureReason: OrderFailureReason.Unknown },
    7: { status: OrderStatus.Refunded },
};

/**
 * Extract a fill event from a Bungee status response.
 * Returns status, optional failureReason, fillTxHash, and a FillEvent when finalized.
 */
export function extractFillEvent(
    response: BungeeStatusResponse,
    params: GetFillParams,
): {
    event: FillEvent | null;
    status: OrderStatus;
    failureReason?: OrderFailureReason;
    fillTxHash?: string;
} {
    const entry = response.result[0];
    if (!entry) {
        return { event: null, status: OrderStatus.Pending };
    }

    const { status, failureReason } = BUNGEE_STATUS_MAP[entry.bungeeStatusCode] ?? {
        status: OrderStatus.Pending,
    };

    const fillTxHash = entry.destinationData.txHash ?? undefined;
    const base = { event: null, status, failureReason, fillTxHash };

    if (status !== OrderStatus.Finalized || !fillTxHash) {
        return { ...base, event: null };
    }

    return {
        event: {
            fillTxHash: fillTxHash as Hex,
            blockNumber: 0n,
            timestamp: entry.destinationData.timestamp ?? 0,
            originChainId: params.originChainId,
            orderId: params.orderId,
            relayer: zeroAddress,
            recipient: zeroAddress,
        },
        status,
        failureReason,
    };
}
