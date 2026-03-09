import { describe, expect, it } from "vitest";

import { base58checkDecode, base58checkEncode } from "../../src/utils/bitcoin.js";

describe("base58check", () => {
    // https://en.bitcoin.it/wiki/List_of_address_prefixes
    const p2shAddress = "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy";

    it("roundtrips a base58check-encoded address", () => {
        const payload = base58checkDecode(p2shAddress);
        const reencoded = base58checkEncode(payload);
        expect(reencoded).toBe(p2shAddress);
    });

    it("rejects input that is too short", () => {
        expect(() => base58checkDecode("1")).toThrow("too short");
    });

    it("rejects addresses with corrupted checksum", () => {
        // Change last character to corrupt the checksum
        const corrupted = p2shAddress.slice(0, -1) + "z";
        expect(() => base58checkDecode(corrupted)).toThrow("checksum mismatch");
    });
});
