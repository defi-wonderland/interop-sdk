import { describe, expect, it } from "vitest";

import {
    base58checkDecode,
    base58checkEncode,
    bech32Decode,
    bech32Encode,
} from "../../src/utils/bitcoin.js";

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
        const corrupted = p2shAddress.slice(0, -1) + "z";
        expect(() => base58checkDecode(corrupted)).toThrow("checksum mismatch");
    });
});

describe("bech32", () => {
    // BIP-350 test vectors
    // https://github.com/bitcoin/bips/blob/master/bip-0350.mediawiki#test-vectors
    const segwitAddress = "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4";
    const taprootAddress = "bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0";

    it("decodes a SegWit v0 address (bech32)", () => {
        const { hrp, version, program } = bech32Decode(segwitAddress, "bech32");
        expect(hrp).toBe("bc");
        expect(version).toBe(0);
        expect(program.length).toBe(20);
    });

    it("decodes a Taproot v1 address (bech32m)", () => {
        const { hrp, version, program } = bech32Decode(taprootAddress, "bech32m");
        expect(hrp).toBe("bc");
        expect(version).toBe(1);
        expect(program.length).toBe(32);
    });

    it("roundtrips a SegWit v0 address", () => {
        const { hrp, version, program } = bech32Decode(segwitAddress, "bech32");
        const reencoded = bech32Encode(hrp, version, program, "bech32");
        expect(reencoded).toBe(segwitAddress);
    });

    it("roundtrips a Taproot address", () => {
        const { hrp, version, program } = bech32Decode(taprootAddress, "bech32m");
        const reencoded = bech32Encode(hrp, version, program, "bech32m");
        expect(reencoded).toBe(taprootAddress);
    });

    it("rejects an invalid bech32 address", () => {
        expect(() => bech32Decode("bc1invalidaddress", "bech32")).toThrow();
    });
});
