import { describe, expect, it } from "vitest";

import { isInteropAddress } from "../src/internal.js";

const testAddress = (address: string, expected: boolean): void => {
    it(`${expected ? "true" : "false"} for ${address}`, async () => {
        expect(await isInteropAddress(address)).toBe(expected);
    });
};

describe("isInteropAddress", () => {
    testAddress("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1#4CA88C9C", true);

    // Missing chain and checksum
    testAddress("0xd8dA6BF26964aF9D7eEd9e03E53415D37", false);

    // Missing chain reference (valid per ERC-7930 for raw addresses)
    testAddress("0xd8dA6BF26964aF9D7eEd9e03E53415D37@eip155", true);

    // Missing chain namespace
    testAddress("0xd8dA6BF26964aF9D7eEd9e03E53415D37@:1#4CA88C9C", false);

    testAddress("@eip155:1#F54D4FBF", true);

    // Invalid chain reference
    testAddress("vitalik.eth@eip155:1000000#4CA88C9C", false);

    // Invalid checksum
    testAddress("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1#FFFFFFFF", false);

    // Missing checksum (valid per ERC-7930/7828)
    testAddress("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1", true);

    // Invalid chain namespace
    testAddress("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1000000#4CA88C9C", false);

    testAddress("0x00010000010114D8DA6BF26964AF9D7EED9E03E53415D37AA96045", true);

    testAddress(
        "0x000100022045296998a6f8e2a784db5d9f95e18fc23f70441a1039446801089879b08c7ef02005333498d5aea4ae009585c43f7b8c30df8e70187d4a713d134f977fc8dfe0b5",
        true,
    );

    // Missing chain namespace
    testAddress("0x0001", false);

    // Missing chain reference
    testAddress("0x00010000", false);

    // Invalid chain reference
    testAddress("0x000100000201", false);

    // Missing address length
    testAddress("0x00010000020100", false);

    // Invalid address length
    testAddress("0x000100000201000200", false);
});
