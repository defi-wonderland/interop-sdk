import type { Hex } from "viem";
import { describe, expect, it } from "vitest";

import { extractOpenedIntent } from "../../../../src/protocols/relay/adapters/openedIntentAdapter.js";

// ── Constants ────────────────────────────────────────────

const TX_HASH = "0xabc123" as Hex;
const ORIGIN_TX_HASH = "0xorigin111" as Hex;
const ORIGIN_CHAIN_ID = 11155111;
const DESTINATION_CHAIN_ID = 84532;

// ── Tests ────────────────────────────────────────────────

describe("extractOpenedIntent", () => {
    it("maps a complete API response to OpenedIntent", () => {
        const result = extractOpenedIntent(
            {
                status: "pending",
                originChainId: ORIGIN_CHAIN_ID,
                destinationChainId: DESTINATION_CHAIN_ID,
                inTxHashes: [ORIGIN_TX_HASH],
            },
            TX_HASH,
        );
        expect(result.orderId).toBe(TX_HASH);
        expect(result.txHash).toBe(ORIGIN_TX_HASH);
        expect(result.originChainId).toBe(ORIGIN_CHAIN_ID);
        expect(result.fillDeadline).toBe(Number.MAX_SAFE_INTEGER);
        expect(result.fillInstructions).toHaveLength(1);
        expect(result.fillInstructions[0]!.destinationChainId).toBe(DESTINATION_CHAIN_ID);
    });

    it("uses fallback values when optional fields are absent", () => {
        const result = extractOpenedIntent(
            { status: "pending", originChainId: ORIGIN_CHAIN_ID },
            TX_HASH,
        );
        expect(result.txHash).toBe(TX_HASH);
        expect(result.fillInstructions).toHaveLength(0);
    });

    it("throws OpenedIntentNotFoundError on invalid response", () => {
        expect(() => extractOpenedIntent({ invalid: "data" }, TX_HASH)).toThrow(
            "relay opened intent event not found",
        );
    });
});
