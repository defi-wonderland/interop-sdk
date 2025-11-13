import { describe, expect, it } from "vitest";

import { getChainId } from "../src/external.js";
import { BinaryAddress } from "../src/types/binaryAddress.js";

describe("getChainId", () => {
    it("formats an EVM InteropAddress", async () => {
        const binaryAddress =
            "0x00010000010114d8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as BinaryAddress;

        const result = await getChainId(binaryAddress as BinaryAddress);
        expect(result).toBe(1);
    });

    it("should handle different chain types", async () => {
        const testCases: BinaryAddress[] = [
            "0x00010000010114d8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as BinaryAddress, // Ethereum mainnet
            "0x000100022045296998a6f8e2a784db5d9f95e18fc23f70441a1039446801089879b08c7ef02005333498d5aea4ae009585c43f7b8c30df8e70187d4a713d134f977fc8dfe0b5" as BinaryAddress, // solana
            "0x00010000010A14DE2b660f31EA7EFE705631710379fE9D2AF02A66" as BinaryAddress, // Ethereum L2
        ];

        const expectedResults = [1, "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d", 10];

        for (let i = 0; i < testCases.length; i++) {
            const result = await getChainId(testCases[i] || "");
            expect(result).toBe(expectedResults[i]);
        }
    });

    it("gets the chain id from a human readable address: mainnet", async () => {
        const humanReadableAddress = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1#4CA88C9C";
        const expected = 1;
        expect(await getChainId(humanReadableAddress)).toBe(expected);
    });

    it("gets the chain id from a human readable address: l2", async () => {
        const humanReadableAddress =
            "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:8453#17DE0709";
        const expected = 8453;
        expect(await getChainId(humanReadableAddress)).toBe(expected);
    });
});
