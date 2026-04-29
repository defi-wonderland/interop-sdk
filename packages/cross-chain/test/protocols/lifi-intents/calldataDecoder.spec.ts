import { describe, expect, it } from "vitest";

import { extractLifiIntentExpiry } from "../../../src/protocols/lifi-intents/utils/calldataDecoder.js";

const LIVE_CALLDATA =
    "0x7515fd56" +
    "0000000000000000000000000000000000000000000000000000000000000020" +
    "0000000000000000000000006f1be137988e6e860f02e7d4e4d3c55869948daa" +
    "00000000000000000000000000000000000000000000000000000000 2b282a0a".replace(/\s/g, "") +
    "0000000000000000000000000000000000000000000000000000000000002105" +
    "0000000000000000000000000000000000000000000000000000000069f4cbe3" +
    "0000000000000000000000000000000000000000000000000000000069f24503" +
    "0000000000000000000000000000003e06000007a224aee90052fa6bb46d43c9" +
    "0000000000000000000000000000000000000000000000000000000000000100";

const LIVE_EXPIRY = 0x69f4cbe3; // 1777481443

describe("extractLifiIntentExpiry", () => {
    it("extracts the expiry timestamp from real LiFi open-intent calldata", () => {
        expect(extractLifiIntentExpiry(LIVE_CALLDATA)).toBe(LIVE_EXPIRY);
    });

    it("accepts Uint8Array input as well as hex strings", () => {
        const bytes = new Uint8Array(
            LIVE_CALLDATA.slice(2)
                .match(/.{2}/g)!
                .map((b) => parseInt(b, 16)),
        );
        expect(extractLifiIntentExpiry(bytes)).toBe(LIVE_EXPIRY);
    });

    it("returns undefined for undefined input", () => {
        expect(extractLifiIntentExpiry(undefined)).toBeUndefined();
    });

    it("returns undefined when the calldata is shorter than the expected layout", () => {
        expect(extractLifiIntentExpiry("0x1234")).toBeUndefined();
    });

    it("returns undefined when the decoded value is implausible", () => {
        // Same prefix but with the expiry word zeroed out
        const bogus =
            "0x7515fd56" +
            "0000000000000000000000000000000000000000000000000000000000000020" +
            "0000000000000000000000006f1be137988e6e860f02e7d4e4d3c55869948daa" +
            "0000000000000000000000000000000000000000000000000000000000000000" +
            "0000000000000000000000000000000000000000000000000000000000002105" +
            "0000000000000000000000000000000000000000000000000000000000000000" + // expiry = 0
            "0000000000000000000000000000000000000000000000000000000000000000";
        expect(extractLifiIntentExpiry(bogus)).toBeUndefined();
    });

    it("returns undefined for non-hex strings", () => {
        expect(extractLifiIntentExpiry("not-hex")).toBeUndefined();
    });
});
