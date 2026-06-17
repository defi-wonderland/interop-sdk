import type { Hex } from "viem";
import { isHex } from "viem";

import type { FillEvent, GetFillParams, OrderFailureReason } from "../../../internal.js";
import type { SuperbridgeActivity, SuperbridgeActivityStep } from "../schemas.js";
import { OrderStatus } from "../../../internal.js";
import { SuperbridgeActivityResponseSchema } from "../schemas.js";

/**
 * Extract fill status and fill event from a Superbridge `/v1/activity` response.
 * Used by the core fill watcher to detect completion.
 */
export function extractFillEvent(
    response: unknown,
    params: GetFillParams,
): {
    event: FillEvent | null;
    status: OrderStatus;
    failureReason?: OrderFailureReason;
    fillTxHash?: string;
} {
    const parsed = SuperbridgeActivityResponseSchema.safeParse(response);
    if (!parsed.success) {
        return { event: null, status: OrderStatus.Pending };
    }

    const bridge = findBridge(parsed.data, params.openTxHash);
    if (!bridge) {
        return { event: null, status: OrderStatus.Pending };
    }

    const fillTxHash = findFillTxHash(bridge);

    if (bridge.steps.every(isStepDone) && fillTxHash) {
        return {
            event: {
                fillTxHash,
                blockNumber: 0n,
                timestamp: 0,
                originChainId: params.originChainId,
                orderId: params.orderId,
            },
            status: OrderStatus.Finalized,
            fillTxHash,
        };
    }

    return {
        event: null,
        status: anyStepStarted(bridge) ? OrderStatus.Executing : OrderStatus.Pending,
    };
}

/** Find the activity whose origin step matches the given transaction hash. */
export function findBridge(
    activities: SuperbridgeActivity[],
    originTxHash: string | undefined,
): SuperbridgeActivity | undefined {
    if (originTxHash) {
        const target = originTxHash.toLowerCase();
        return activities.find((activity) =>
            activity.steps.some(
                (step) =>
                    step.type === "transaction" &&
                    step.confirmation?.transactionHash?.toLowerCase() === target,
            ),
        );
    }
    return activities[0];
}

function isStepDone(step: SuperbridgeActivityStep): boolean {
    if (step.type === "transaction") {
        return step.transactionStatus === "done" || step.transactionStatus === "auto";
    }
    if (step.type === "wait") {
        return step.waitStatus === "done";
    }
    return true;
}

function anyStepStarted(bridge: SuperbridgeActivity): boolean {
    return bridge.steps.some((step) => {
        if (step.type === "transaction") {
            return step.transactionStatus === "done" || step.transactionStatus === "auto";
        }
        if (step.type === "wait") {
            return step.waitStatus === "done" || step.waitStatus === "in-progress";
        }
        return false;
    });
}

function findFillTxHash(bridge: SuperbridgeActivity): Hex | undefined {
    const destinationChainId = bridge.toChainId;
    let last: string | undefined;
    for (const step of bridge.steps) {
        if (step.type !== "transaction") continue;
        if (step.transactionStatus !== "done" && step.transactionStatus !== "auto") continue;
        if (
            destinationChainId !== undefined &&
            step.chainId !== undefined &&
            step.chainId !== destinationChainId
        ) {
            continue;
        }
        const hash = step.confirmation?.transactionHash;
        if (typeof hash === "string") last = hash;
    }
    return last !== undefined && isHex(last) ? last : undefined;
}
