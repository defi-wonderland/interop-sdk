import { describe, expect, it } from "vitest";

import { BinaryAddress } from "../src/types/binaryAddress.js";
import { getChainId } from "../src/utils/getChainId.js";

describe("getChainId", () => {
    it("formats an EVM InteropAddress", () => {
        const binaryAddress =
            "0x00010000010114d8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as BinaryAddress;

        const result = getChainId(binaryAddress as BinaryAddress);
        expect(result).toBe(1);
    });

    it("should handle different chain types", () => {
        const testCases: BinaryAddress[] = [
            "0x00010000010114d8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as BinaryAddress, // Ethereum mainnet
            "0x000100022045296998a6f8e2a784db5d9f95e18fc23f70441a1039446801089879b08c7ef02005333498d5aea4ae009585c43f7b8c30df8e70187d4a713d134f977fc8dfe0b5" as BinaryAddress, // solana
            "0x00010000010A14DE2b660f31EA7EFE705631710379fE9D2AF02A66" as BinaryAddress, // Ethereum L2
        ];

        const expectedResults = [1, "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d", 10];

        testCases.forEach((testCase, index) => {
            const result = getChainId(testCase);
            expect(result).toBe(expectedResults[index]);
        });
    });
});
