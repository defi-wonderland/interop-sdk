import { describe, expect, it } from "vitest";

import { toNonNegativeBigInt } from "../../../src/core/utils/toNonNegativeBigInt.js";

describe("toNonNegativeBigInt", () => {
    it.each([
        ["bigint zero", 0n, 0n],
        ["positive bigint", 1_000n, 1_000n],
        ["safe-integer number", 1_000, 1_000n],
        ["decimal string", "1000", 1_000n],
        ["hex string", "0x10", 16n],
    ])("accepts %s", (_, input, output) => {
        expect(toNonNegativeBigInt(input)).toBe(output);
    });

    it.each([
        ["negative bigint", -1n],
        ["negative number", -1],
        ["negative decimal string", "-1"],
        ["fractional number", 1.5],
        ["above MAX_SAFE_INTEGER number", 1e18],
        ["malformed string", "abc"],
        ["empty string", ""],
        ["undefined", undefined],
        ["null", null],
        ["object", {}],
    ])("returns undefined for %s", (_, value) => {
        expect(toNonNegativeBigInt(value)).toBeUndefined();
    });
});
