import { Hex } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { InteroperableName } from "../src/types/interopAddress.js";
import { isBinaryInteropAddress, isInteropAddress, isInteroperableName } from "../src/internal.js";

const mockGetEnsAddress = vi.fn();
vi.mock("viem", async () => {
    const actual = await vi.importActual("viem");
    return {
        ...actual,
        createPublicClient: (): unknown => ({
            getEnsAddress: mockGetEnsAddress,
        }),
    };
});

describe("isInteropAddress", () => {
    beforeEach(() => {
        mockGetEnsAddress.mockClear();
        // Default: mock ENS resolution to fail for invalid chain IDs
        mockGetEnsAddress.mockResolvedValue(null);
    });

    const testAddress = (address: string, expected: boolean, timeout?: number): void => {
        it(
            `${expected ? "true" : "false"} for ${address}`,
            async () => {
                expect(await isInteropAddress(address)).toBe(expected);
            },
            timeout,
        );
    };

    describe("interoperable names", () => {
        testAddress("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1#4CA88C9C", true);

        // Missing chain and checksum
        testAddress("0xd8dA6BF26964aF9D7eEd9e03E53415D37", false);

        // Missing chain reference (valid per ERC-7930 for raw addresses)
        testAddress("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155", true);

        // Invalid EVM address (too short) with otherwise valid namespace/reference
        testAddress("0x1234@eip155:1", false);

        // Missing chain namespace
        testAddress("0xd8dA6BF26964aF9D7eEd9e03E53415D37@:1#4CA88C9C", false);

        testAddress("@eip155:1#F54D4FBF", true);

        // Invalid chain reference (ENS resolution will fail for invalid chain ID)
        testAddress("vitalik.eth@eip155:1000000#4CA88C9C", false, 10000);

        // Invalid checksum (validation disabled by default, so this passes)
        testAddress("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1#FFFFFFFF", true);

        // Missing checksum (valid per ERC-7930/7828)
        testAddress("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1", true);

        // Invalid chain reference (might pass parsing but fail validation - depends on implementation)
        // Chain ID 1000000 is not a valid known chain, but parsing might succeed
        testAddress("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1000000#4CA88C9C", true);
    });

    describe("binary addresses", () => {
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
});

describe("isBinaryInteropAddress", () => {
    const testAddress = (address: string, expected: boolean): void => {
        it(`${expected ? "true" : "false"} for ${address}`, () => {
            expect(isBinaryInteropAddress(address as Hex)).toBe(expected);
        });
    };

    testAddress("0x00010000010114D8DA6BF26964AF9D7EED9E03E53415D37AA96045", true);

    testAddress(
        "0x000100022045296998a6f8e2a784db5d9f95e18fc23f70441a1039446801089879b08c7ef02005333498d5aea4ae009585c43f7b8c30df8e70187d4a713d134f977fc8dfe0b5",
        true,
    );

    testAddress("0x00010000020100", false);
});

describe("isInteroperableName", () => {
    beforeEach(() => {
        mockGetEnsAddress.mockClear();
        mockGetEnsAddress.mockResolvedValue(null);
    });

    const testAddress = (address: string, expected: boolean): void => {
        it(`${expected ? "true" : "false"} for ${address}`, async () => {
            expect(await isInteroperableName(address as InteroperableName)).toBe(expected);
        });
    };

    testAddress("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1#4CA88C9C", true);

    testAddress("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:8453#17DE0709", true);

    testAddress(
        "MJKqp326RZCHnAAbew9MDdui3iCKWco7fsK9sVuZTX2@solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d#88835C11",
        true,
    );

    testAddress("@eip155:1#F54D4FBF", true);

    testAddress("MJKqp326RZCHnAAbew9MDdui3iCKWco7fsK9sVuZTX2@solana:#18D1CBB4", true);

    // @solana:#F40BB840 has no address and no chain reference - invalid per spec
    // Spec requires at least one of address or chainReference
    testAddress("@solana:#F40BB840", false);
});
