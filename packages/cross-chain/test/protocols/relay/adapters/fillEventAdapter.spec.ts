import { describe, expect, it } from "vitest";

import type { GetFillParams } from "../../../../src/internal.js";
import type { RelayIntentStatusResponse } from "../../../../src/protocols/relay/schemas.js";
import { OrderFailureReason, OrderStatus } from "../../../../src/core/types/orderTracking.js";
import { extractFillEvent } from "../../../../src/protocols/relay/adapters/fillEventAdapter.js";

// ── Constants ────────────────────────────────────────────

const ORDER_ID = "0xorder456";
const ORIGIN_CHAIN_ID = 1;
const SAMPLE_TIMESTAMP = 1700000000;
const SAMPLE_FILL_TX_HASH = "0xfillhash";

const FILL_PARAMS: GetFillParams = {
    orderId: ORDER_ID,
    originChainId: ORIGIN_CHAIN_ID,
    destinationChainId: 10,
};

// ── Helpers ──────────────────────────────────────────────

function makeStatusResponse(
    overrides?: Partial<RelayIntentStatusResponse>,
): RelayIntentStatusResponse {
    return { status: "pending", ...overrides };
}

// ── Tests ────────────────────────────────────────────────

describe("extractFillEvent", () => {
    it.each([
        ["waiting", OrderStatus.Pending],
        ["pending", OrderStatus.Executing],
        ["submitted", OrderStatus.Settling],
        ["success", OrderStatus.Finalized],
        ["failure", OrderStatus.Failed],
        ["refund", OrderStatus.Refunded],
    ])("maps '%s' to %s", (relayStatus, expectedStatus) => {
        const result = extractFillEvent(
            makeStatusResponse({ status: relayStatus as RelayIntentStatusResponse["status"] }),
            FILL_PARAMS,
        );
        expect(result.status).toBe(expectedStatus);
    });

    it("includes Unknown failure reason for 'failure' status", () => {
        const result = extractFillEvent(makeStatusResponse({ status: "failure" }), FILL_PARAMS);
        expect(result.failureReason).toBe(OrderFailureReason.Unknown);
    });

    it("returns FillEvent when finalized with txHashes", () => {
        const result = extractFillEvent(
            makeStatusResponse({
                status: "success",
                txHashes: [SAMPLE_FILL_TX_HASH],
                updatedAt: SAMPLE_TIMESTAMP,
            }),
            FILL_PARAMS,
        );
        expect(result.event).not.toBeNull();
        expect(result.event!.fillTxHash).toBe(SAMPLE_FILL_TX_HASH);
        expect(result.event!.timestamp).toBe(SAMPLE_TIMESTAMP);
        expect(result.event!.originChainId).toBe(ORIGIN_CHAIN_ID);
        expect(result.event!.orderId).toBe(ORDER_ID);
    });

    it("returns null event when finalized without txHashes", () => {
        expect(
            extractFillEvent(makeStatusResponse({ status: "success" }), FILL_PARAMS).event,
        ).toBeNull();
    });

    it("returns null event for non-finalized status even with txHashes", () => {
        const result = extractFillEvent(
            makeStatusResponse({ status: "pending", txHashes: [SAMPLE_FILL_TX_HASH] }),
            FILL_PARAMS,
        );
        expect(result.event).toBeNull();
        expect(result.fillTxHash).toBe(SAMPLE_FILL_TX_HASH);
    });
});
