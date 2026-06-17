import { describe, expect, it } from "vitest";

import type { GetFillParams } from "../../../../src/core/types/orderTracking.js";
import { OrderStatus } from "../../../../src/core/types/orderTracking.js";
import {
    extractFillEvent,
    findBridge,
} from "../../../../src/protocols/superbridge/adapters/activityAdapter.js";
import { SuperbridgeActivityResponseSchema } from "../../../../src/protocols/superbridge/schemas.js";

const ORIGIN_TX = "0x0riginaa00000000000000000000000000000000000000000000000000000000";
const FILL_TX = "0xf1110000000000000000000000000000000000000000000000000000000000aa";

function params(): GetFillParams {
    return {
        orderId: ORIGIN_TX,
        openTxHash: ORIGIN_TX,
        originChainId: 1,
        destinationChainId: 8453,
    };
}

function activity(steps: unknown[]): unknown {
    return [
        {
            id: "bridge-1",
            provider: { name: "across-v3" },
            fromChainId: "1",
            toChainId: "8453",
            steps,
        },
    ];
}

describe("extractFillEvent", () => {
    it("returns Finalized with the fill tx when all steps are done", () => {
        const response = activity([
            {
                type: "transaction",
                chainId: "1",
                transactionStatus: "done",
                confirmation: { transactionHash: ORIGIN_TX },
            },
            {
                type: "transaction",
                chainId: "8453",
                transactionStatus: "done",
                confirmation: { transactionHash: FILL_TX },
            },
        ]);

        const out = extractFillEvent(response, params());

        expect(out.status).toBe(OrderStatus.Finalized);
        expect(out.event?.fillTxHash).toBe(FILL_TX);
    });

    it("returns Executing while a step is still in progress", () => {
        const response = activity([
            {
                type: "transaction",
                chainId: "1",
                transactionStatus: "done",
                confirmation: { transactionHash: ORIGIN_TX },
            },
            {
                type: "wait",
                waitStatus: "in-progress",
                waitType: "op-challenge-period",
                startedAt: 1000,
                expectedDuration: 604800000,
            },
        ]);

        const out = extractFillEvent(response, params());

        expect(out.status).toBe(OrderStatus.Executing);
        expect(out.event).toBeNull();
    });

    it("returns Pending when no activity matches", () => {
        const out = extractFillEvent([], params());

        expect(out.status).toBe(OrderStatus.Pending);
        expect(out.event).toBeNull();
    });

    it("does not expose a fill tx hash before finalization", () => {
        const response = activity([
            {
                type: "transaction",
                chainId: "1",
                transactionStatus: "done",
                confirmation: { transactionHash: ORIGIN_TX },
            },
            {
                type: "transaction",
                chainId: "8453",
                transactionStatus: "done",
                confirmation: { transactionHash: FILL_TX },
            },
            { type: "wait", waitStatus: "in-progress" },
        ]);

        const out = extractFillEvent(response, params());

        expect(out.status).toBe(OrderStatus.Executing);
        expect(out.fillTxHash).toBeUndefined();
    });

    it("falls back to the last completed tx when steps omit a chain id", () => {
        const response = activity([
            {
                type: "transaction",
                transactionStatus: "done",
                confirmation: { transactionHash: ORIGIN_TX },
            },
            {
                type: "transaction",
                transactionStatus: "done",
                confirmation: { transactionHash: FILL_TX },
            },
        ]);

        const out = extractFillEvent(response, params());

        expect(out.status).toBe(OrderStatus.Finalized);
        expect(out.event?.fillTxHash).toBe(FILL_TX);
    });

    it("selects the destination-chain tx as the fill, not a later origin-chain tx", () => {
        const response = activity([
            {
                type: "transaction",
                chainId: "8453",
                transactionStatus: "done",
                confirmation: { transactionHash: FILL_TX },
            },
            {
                type: "transaction",
                chainId: "1",
                transactionStatus: "done",
                confirmation: { transactionHash: ORIGIN_TX },
            },
        ]);

        const out = extractFillEvent(response, params());

        expect(out.status).toBe(OrderStatus.Finalized);
        expect(out.event?.fillTxHash).toBe(FILL_TX);
    });
});

describe("findBridge", () => {
    it("matches the activity by origin transaction hash", () => {
        const parsed = SuperbridgeActivityResponseSchema.parse(
            activity([
                {
                    type: "transaction",
                    transactionStatus: "done",
                    confirmation: { transactionHash: ORIGIN_TX },
                },
            ]),
        );

        expect(findBridge(parsed, ORIGIN_TX)?.id).toBe("bridge-1");
    });

    it("falls back to the first activity when no step matches the origin tx hash", () => {
        const parsed = SuperbridgeActivityResponseSchema.parse(
            activity([
                {
                    type: "transaction",
                    transactionStatus: "done",
                    confirmation: { transactionHash: FILL_TX },
                },
            ]),
        );

        expect(findBridge(parsed, ORIGIN_TX)?.id).toBe("bridge-1");
    });
});
