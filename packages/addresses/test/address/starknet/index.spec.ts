import { describe, expect, it } from "vitest";

import {
    starknetAddressToBinary,
    starknetAddressToText,
} from "../../../src/address/starknet/index.js";
import { STARKNET_ADDRESS } from "./fixtures.js";

describe("starknetAddressToBinary", () => {
    it("converts a valid starknet address to 32 bytes", () => {
        const binary = starknetAddressToBinary(STARKNET_ADDRESS);
        expect(binary).toBeInstanceOf(Uint8Array);
        expect(binary.length).toBe(32);
    });

    it("left-pads short addresses to 32 bytes", () => {
        const short = "0x0001";
        const binary = starknetAddressToBinary(short);
        expect(binary.length).toBe(32);
        expect(binary[0]).toBe(0);
        expect(binary[1]).toBe(1);
    });

    it("rejects addresses without 0x prefix", () => {
        const noPrefix = STARKNET_ADDRESS.slice(2);
        expect(() => starknetAddressToBinary(noPrefix)).toThrow("Invalid starknet address");
    });

    it("rejects addresses longer than 64 hex chars", () => {
        const tooLong = "0x" + "f".repeat(65);
        expect(() => starknetAddressToBinary(tooLong)).toThrow("Invalid starknet address");
    });
});

describe("starknetAddressToText", () => {
    it("converts 32 bytes back to 0x-prefixed hex", () => {
        const binary = starknetAddressToBinary(STARKNET_ADDRESS);
        const text = starknetAddressToText(binary);
        expect(text).toBe(STARKNET_ADDRESS);
    });

    it("roundtrips through binary and back", () => {
        const binary = starknetAddressToBinary(STARKNET_ADDRESS);
        const text = starknetAddressToText(binary);
        const binary2 = starknetAddressToBinary(text);
        expect(binary2).toEqual(binary);
    });

    it("rejects arrays that are not 32 bytes", () => {
        const short = new Uint8Array(20);
        expect(() => starknetAddressToText(short)).toThrow("must be 32 bytes");
    });
});
