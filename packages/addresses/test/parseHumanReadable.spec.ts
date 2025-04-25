import { hexToBytes } from "viem";
import { describe, expect, it } from "vitest";

import type { InteropAddress } from "../src/internal.js";
import { parseHumanReadable } from "../src/internal.js";

describe("erc7930", () => {
    describe("parseHumanReadable", () => {
        it("convert EVM mainnet address to interop address", () => {
            const humanReadableAddress =
                "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1#4CA88C9C";
            const expected: InteropAddress = {
                version: 1,
                chainType: hexToBytes("0x0000"),
                chainReference: hexToBytes("0x01"),
                address: hexToBytes("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"),
            };

            const interopAddress = parseHumanReadable(humanReadableAddress);

            expect(interopAddress).toEqual(expected);
        });
    });
});
