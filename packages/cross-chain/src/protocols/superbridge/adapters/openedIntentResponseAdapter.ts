import type { Hex } from "viem";
import { zeroAddress } from "viem";

import type { OpenedIntent } from "../../../internal.js";
import { OpenedIntentNotFoundError } from "../../../internal.js";
import { SUPERBRIDGE_PROTOCOL_NAME } from "../constants.js";
import { SuperbridgeActivityResponseSchema } from "../schemas.js";
import { findBridge } from "./activityAdapter.js";

/**
 * Adapt a Superbridge `/v1/activity` response into an OpenedIntent.
 *
 * Uses the origin transaction hash as the order identifier and reads the
 * destination chain from the matched activity.
 *
 * @throws {OpenedIntentNotFoundError} When no matching activity is found.
 */
export function adaptOpenedIntentResponse(response: unknown, txHash: Hex): OpenedIntent {
    const parsed = SuperbridgeActivityResponseSchema.safeParse(response);
    if (!parsed.success) {
        throw new OpenedIntentNotFoundError(txHash, SUPERBRIDGE_PROTOCOL_NAME);
    }

    const bridge = findBridge(parsed.data, txHash);
    if (!bridge) {
        throw new OpenedIntentNotFoundError(txHash, SUPERBRIDGE_PROTOCOL_NAME);
    }

    const destinationChainId = bridge.toChainId ? Number(bridge.toChainId) : undefined;

    return {
        user: zeroAddress,
        originChainId: bridge.fromChainId ? Number(bridge.fromChainId) : 0,
        openDeadline: 0,
        fillDeadline: 0xffffffff,
        orderId: txHash,
        maxSpent: [],
        minReceived: [],
        fillInstructions: destinationChainId
            ? [{ destinationChainId, destinationSettler: zeroAddress, originData: "0x" }]
            : [],
        txHash,
        blockNumber: 0n,
        originContract: zeroAddress,
    };
}
