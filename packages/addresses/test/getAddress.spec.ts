import { hexToBytes } from "viem";
import { describe, expect, it } from "vitest";

import type { InteropAddress } from "../src/types/interopAddress.js";
import { getAddress } from "../src/utils/getAddress.js";

describe("getAddress", () => {
    it("formats an EVM InteropAddress", () => {
        const interopAddress: InteropAddress = {
            version: 1,
            chainType: hexToBytes("0x0000"),
            chainReference: hexToBytes("0x01"),
            address: hexToBytes("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"),
        };

        const result = getAddress(interopAddress);
        expect(result).toBe("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
    });

    it("should handle different chain types", () => {
        const testCases: InteropAddress[] = [
            {
                // Ethereum mainnet
                version: 1,
                chainType: hexToBytes("0x0000"),
                chainReference: hexToBytes("0x01"),
                address: hexToBytes("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"),
            },
            {
                // EVM rollup - OP
                version: 1,
                chainType: hexToBytes("0x0000"),
                chainReference: hexToBytes("0x0A"),
                address: hexToBytes("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"),
            },
            {
                // Solana
                version: 1,
                chainType: hexToBytes("0x0002"),
                chainReference: hexToBytes(
                    "0x45296998a6f8e2a784db5d9f95e18fc23f70441a1039446801089879b08c7ef0",
                ),
                address: hexToBytes(
                    "0x05333498d5aea4ae009585c43f7b8c30df8e70187d4a713d134f977fc8dfe0b5",
                ),
            },
        ];

        const expectedResults = [
            "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
            "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
            "MJKqp326RZCHnAAbew9MDdui3iCKWco7fsK9sVuZTX2",
        ];

        testCases.forEach((testCase, index) => {
            const result = getAddress(testCase);
            expect(result).toBe(expectedResults[index]);
        });
    });
});
