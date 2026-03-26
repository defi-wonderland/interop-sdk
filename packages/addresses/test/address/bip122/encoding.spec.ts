import { describe, expect, it } from "vitest";

import {
    base58checkDecode,
    base58checkEncode,
    bech32Decode,
    bech32Encode,
} from "../../../src/address/bip122/encoding.js";
import { BIP122_P2SH_ADDRESS, BIP122_SEGWIT_ADDRESS, BIP122_TAPROOT_ADDRESS } from "./fixtures.js";

describe("base58check", () => {
    it("roundtrips a base58check-encoded address", () => {
        const payload = base58checkDecode(BIP122_P2SH_ADDRESS);
        const reencoded = base58checkEncode(payload);
        expect(reencoded).toBe(BIP122_P2SH_ADDRESS);
    });

    it("rejects input that is too short", () => {
        expect(() => base58checkDecode("1")).toThrow("too short");
    });

    it("rejects addresses with corrupted checksum", () => {
        const corrupted = BIP122_P2SH_ADDRESS.slice(0, -1) + "z";
        expect(() => base58checkDecode(corrupted)).toThrow("checksum mismatch");
    });
});

describe("bech32", () => {
    it("decodes a SegWit v0 address (bech32)", () => {
        const { version, program } = bech32Decode(BIP122_SEGWIT_ADDRESS, "bech32");
        expect(version).toBe(0);
        expect(program.length).toBe(20);
    });

    it("decodes a Taproot v1 address (bech32m)", () => {
        const { version, program } = bech32Decode(BIP122_TAPROOT_ADDRESS, "bech32m");
        expect(version).toBe(1);
        expect(program.length).toBe(32);
    });

    it("roundtrips a SegWit v0 address", () => {
        const { hrp, version, program } = bech32Decode(BIP122_SEGWIT_ADDRESS, "bech32");
        const reencoded = bech32Encode(hrp, version, program);
        expect(reencoded).toBe(BIP122_SEGWIT_ADDRESS);
    });

    it("roundtrips a Taproot address", () => {
        const { hrp, version, program } = bech32Decode(BIP122_TAPROOT_ADDRESS, "bech32m");
        const reencoded = bech32Encode(hrp, version, program);
        expect(reencoded).toBe(BIP122_TAPROOT_ADDRESS);
    });

    it("rejects a bech32m address decoded as bech32", () => {
        expect(() => bech32Decode(BIP122_TAPROOT_ADDRESS, "bech32")).toThrow();
    });

    it("rejects a bech32 address decoded as bech32m", () => {
        expect(() => bech32Decode(BIP122_SEGWIT_ADDRESS, "bech32m")).toThrow();
    });
});
