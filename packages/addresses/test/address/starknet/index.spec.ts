import { describe, expect, it } from "vitest";

import { starknetAddressToBinary } from "../../../src/address/starknet/index.js";
import { STARKNET_ADDRESS } from "./fixtures.js";

describe("starknetAddressToBinary", () => {
    it("converts a valid starknet address to 32 bytes", () => {
        const binary = starknetAddressToBinary(STARKNET_ADDRESS);
        expect(binary).toBeInstanceOf(Uint8Array);
        expect(binary.length).toBe(32);
    });

    it("left-pads short addresses to 32 bytes", () => {
        const binary = starknetAddressToBinary("0x01");
        const expected = new Uint8Array(32);
        expected[31] = 1;
        expect(binary).toEqual(expected);
    });

    it("rejects addresses without 0x prefix", () => {
        const noPrefix = STARKNET_ADDRESS.slice(2);
        expect(() => starknetAddressToBinary(noPrefix)).toThrow("Invalid starknet address");
    });

    it("rejects addresses longer than 64 hex chars", () => {
        const tooLong = "0x" + "f".repeat(65);
        expect(() => starknetAddressToBinary(tooLong)).toThrow("Invalid starknet address");
    });

    it("rejects addresses exceeding felt252 range", () => {
        const overMax = "0x" + "f".repeat(64);
        expect(() => starknetAddressToBinary(overMax)).toThrow("exceeds felt252 range");
    });
});
