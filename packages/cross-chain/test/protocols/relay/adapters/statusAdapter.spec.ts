import type { Hex } from "viem";
import { describe, expect, it } from "vitest";

import type { RelayIntentStatusResponse } from "../../../../src/protocols/relay/schemas.js";
import { OrderFailureReason, OrderStatus } from "../../../../src/core/types/orderTracking.js";
import {
    extractFillEvent,
    extractOpenedIntent,
} from "../../../../src/protocols/relay/adapters/statusAdapter.js";

// ── Constants ────────────────────────────────────────────

const ORDER_ID = "0xorder456";
const ORIGIN_CHAIN_ID = 1;
const SAMPLE_TIMESTAMP = 1700000000;
const SAMPLE_FILL_TX_HASH = "0xfillhash";

const FILL_PARAMS = {
    orderId: ORDER_ID,
    originChainId: ORIGIN_CHAIN_ID,
    openTxHash: "0xtx",
} as never;

// ── Tests ────────────────────────────────────────────────

describe("extractFillEvent", () => {
    it("returns Finalized with FillEvent when success has txHashes", () => {
        const response: RelayIntentStatusResponse = {
            status: "success",
            txHashes: [SAMPLE_FILL_TX_HASH],
            updatedAt: SAMPLE_TIMESTAMP,
        };
        const result = extractFillEvent(response, FILL_PARAMS);
        expect(result.status).toBe(OrderStatus.Finalized);
        expect(result.event).not.toBeNull();
        expect(result.event!.fillTxHash).toBe(SAMPLE_FILL_TX_HASH);
        expect(result.event!.timestamp).toBe(SAMPLE_TIMESTAMP);
    });

    it("returns null event when success has no txHashes", () => {
        expect(extractFillEvent({ status: "success" }, FILL_PARAMS).event).toBeNull();
        expect(extractFillEvent({ status: "success", txHashes: [] }, FILL_PARAMS).event).toBeNull();
    });

    it("returns fillTxHash in base when available", () => {
        const result = extractFillEvent(
            { status: "pending", txHashes: [SAMPLE_FILL_TX_HASH] },
            FILL_PARAMS,
        );
        expect(result.fillTxHash).toBe(SAMPLE_FILL_TX_HASH);
        expect(result.event).toBeNull();
    });

    it("maps 'failure' to Failed with Unknown reason", () => {
        const result = extractFillEvent({ status: "failure" }, FILL_PARAMS);
        expect(result.status).toBe(OrderStatus.Failed);
        expect(result.failureReason).toBe(OrderFailureReason.Unknown);
        expect(result.event).toBeNull();
    });

    it("maps 'refund' to Refunded", () => {
        expect(extractFillEvent({ status: "refund" }, FILL_PARAMS).status).toBe(
            OrderStatus.Refunded,
        );
    });

    it("maps 'waiting' to Pending", () => {
        expect(extractFillEvent({ status: "waiting" }, FILL_PARAMS).status).toBe(
            OrderStatus.Pending,
        );
    });

    it("maps 'pending' to Executing", () => {
        expect(extractFillEvent({ status: "pending" }, FILL_PARAMS).status).toBe(
            OrderStatus.Executing,
        );
    });

    it("maps 'submitted' to Settling", () => {
        expect(extractFillEvent({ status: "submitted" }, FILL_PARAMS).status).toBe(
            OrderStatus.Settling,
        );
    });
});

describe("extractOpenedIntent", () => {
    it("maps valid API response to OpenedIntent", () => {
        const txHash = "0xabc123" as Hex;
        const inTxHash = "0xorigin111" as Hex;
        const result = extractOpenedIntent(
            {
                status: "pending",
                originChainId: 11155111,
                destinationChainId: 84532,
                inTxHashes: [inTxHash],
            },
            txHash,
        );
        expect(result.orderId).toBe(txHash);
        expect(result.txHash).toBe(inTxHash);
        expect(result.originChainId).toBe(11155111);
        expect(result.fillInstructions).toHaveLength(1);
        expect(result.fillInstructions[0]!.destinationChainId).toBe(84532);
    });

    it("falls back to txHash when inTxHashes is empty", () => {
        const txHash = "0xabc123" as Hex;
        const result = extractOpenedIntent({ status: "pending", originChainId: 11155111 }, txHash);
        expect(result.txHash).toBe(txHash);
        expect(result.fillInstructions).toHaveLength(0);
    });

    it("throws OpenedIntentNotFoundError on invalid response", () => {
        expect(() => extractOpenedIntent({ invalid: "data" }, "0x123" as Hex)).toThrow(
            "relay opened intent event not found",
        );
    });
});
