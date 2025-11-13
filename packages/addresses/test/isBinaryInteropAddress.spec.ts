import { Hex } from "viem";
import { describe, expect, it } from "vitest";

import { isBinaryInteropAddress } from "../src/internal.js";

const testAddress = (address: string, expected: boolean): void => {
    it(`${expected ? "true" : "false"} for ${address}`, async () => {
        expect(isBinaryInteropAddress(address as Hex)).toBe(expected);
    });
};

describe("isBinaryInteropAddress", () => {
    testAddress("0x00010000010114D8DA6BF26964AF9D7EED9E03E53415D37AA96045", true);

    testAddress(
        "0x000100022045296998a6f8e2a784db5d9f95e18fc23f70441a1039446801089879b08c7ef02005333498d5aea4ae009585c43f7b8c30df8e70187d4a713d134f977fc8dfe0b5",
        true,
    );

    testAddress("0x00010000020100", false);
});
