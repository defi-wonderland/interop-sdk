import bs58 from "bs58";
import { hexToBytes } from "viem";
import { describe, expect, it } from "vitest";

import type { InteropAddress } from "../src/types/interopAddress.js";
import { getChainId } from "../src/utils/getChainId.js";

describe("getChainId", () => {
    it("formats an EVM InteropAddress", () => {
        const interopAddress: InteropAddress = {
            version: 1,
            chainType: hexToBytes("0x0000"),
            chainReference: hexToBytes("0x01"),
            address: hexToBytes("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"),
        };

        const result = getChainId(interopAddress);
        expect(result).toBe(1);
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
                chainReference: bs58.decode("5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d"),
                address: bs58.decode("MJKqp326RZCHnAAbew9MDdui3iCKWco7fsK9sVuZTX2"),
            },
        ];

        const expectedResults = [1, 10, "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d"];

        testCases.forEach((testCase, index) => {
            const result = getChainId(testCase);
            expect(result).toBe(expectedResults[index]);
        });
    });
});
