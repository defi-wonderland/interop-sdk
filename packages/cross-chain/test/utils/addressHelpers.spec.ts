import { Hex } from "viem";
import { describe, expect, it } from "vitest";

import { bytes32ToAddress } from "../../src/utils/addressHelpers.js";

describe("addressHelpers", () => {
    describe("bytes32ToAddress", () => {
        it("should extract address from right-aligned bytes32", () => {
            const bytes32 =
                "0x000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" as Hex;

            const address = bytes32ToAddress(bytes32);

            expect(address).toBe("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
            expect(address.length).toBe(42); // 0x + 40 hex chars
        });
    });
});
