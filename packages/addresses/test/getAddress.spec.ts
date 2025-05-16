import { describe, expect, it } from "vitest";

import { getAddress } from "../src/external.js";
import { BinaryAddress } from "../src/types/binaryAddress.js";

describe("getAddress", () => {
    it("formats an EVM InteropAddress", async () => {
        const binaryAddress =
            "0x00010000010114d8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as BinaryAddress;

        const result = await getAddress(binaryAddress as BinaryAddress);
        expect(result).toBe("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
    });

    it("should handle different chain types", async () => {
        const testCases: BinaryAddress[] = [
            "0x00010000010114d8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as BinaryAddress, // Ethereum mainnet
            "0x000100022045296998a6f8e2a784db5d9f95e18fc23f70441a1039446801089879b08c7ef02005333498d5aea4ae009585c43f7b8c30df8e70187d4a713d134f977fc8dfe0b5" as BinaryAddress, // solana
            "0x00010000010A14DE2b660f31EA7EFE705631710379fE9D2AF02A66" as BinaryAddress, // Ethereum L2
        ];

        const expectedResults = [
            "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
            "MJKqp326RZCHnAAbew9MDdui3iCKWco7fsK9sVuZTX2",
            "0xDE2b660f31EA7EFE705631710379fE9D2AF02A66",
        ];

        testCases.forEach(async (testCase, index) => {
            const result = await getAddress(testCase);
            expect(result).toBe(expectedResults[index]);
        });
    });
});
