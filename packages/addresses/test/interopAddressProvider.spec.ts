import { describe, expect, it, vi } from "vitest";

import type {
    BinaryAddress,
    InteroperableAddressText,
    InteroperableName,
} from "../src/types/index.js";
import {
    binaryToText,
    computeChecksum,
    getAddress,
    getChainId,
    InteropAddressProvider,
    isValidBinaryAddress,
    isValidInteropAddress,
    isValidInteroperableName,
    nameToBinary,
    textToBinary,
} from "../src/providers/InteropAddressProvider.js";

const mockGetEnsName = vi.fn();
const mockGetEnsAddress = vi.fn();
vi.mock("viem", async () => {
    const actual = await vi.importActual("viem");
    return {
        ...actual,
        createPublicClient: (): unknown => ({
            getEnsName: mockGetEnsName,
            getEnsAddress: mockGetEnsAddress,
        }),
    };
});

describe("InteropAddressProvider", () => {
    describe("conversion", () => {
        it("converts an interoperable name to a binary address", async () => {
            const binaryAddress = await nameToBinary(
                "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1#4CA88C9C" as InteroperableName,
            );
            expect(binaryAddress).toBe("0x00010000010114d8da6bf26964af9d7eed9e03e53415d37aa96045");
        });

        // FIXME: use ERC-7828 to reverse resolution of ENS addresses
        it.skip("converts a binary address to an interoperable name", () => {
            mockGetEnsName.mockResolvedValue("vitalik.eth");
            const interoperableName = InteropAddressProvider.binaryToName(
                "0x00010000010114d8da6bf26964af9d7eed9e03e53415d37aa96045" as BinaryAddress,
            );
            expect(interoperableName).toBe("vitalik.eth@eip155:1#4CA88C9C");
        });
    });

    describe("checksum", () => {
        it("computes the checksum of an interoperable name", async () => {
            const checksum = await computeChecksum(
                "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1",
            );
            expect(checksum).toBe("4CA88C9C");
        });
    });

    describe("nameToBinary with ParsedInteropNameComponents", () => {
        it("builds a binary InteroperableAddress from ParsedInteropNameComponents", async () => {
            const parsed = {
                address: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
                chainType: "eip155",
                chainReference: "1",
                checksum: undefined,
            };
            const interopAddress = await nameToBinary(parsed, { format: "hex" });
            expect(interopAddress).toBe("0x00010000010114d8da6bf26964af9d7eed9e03e53415d37aa96045");
        });
    });

    describe("textToBinary", () => {
        it("builds a binary InteroperableAddress from InteroperableAddressText (synchronous)", () => {
            const text: InteroperableAddressText = {
                version: 1,
                chainType: "eip155",
                chainReference: "1",
                address: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
            };
            const interopAddress = textToBinary(text, { format: "hex" });
            expect(interopAddress).toBe("0x00010000010114d8da6bf26964af9d7eed9e03e53415d37aa96045");
        });

        it("builds a binary InteroperableAddress with bytes format", () => {
            const text: InteroperableAddressText = {
                version: 1,
                chainType: "eip155",
                chainReference: "1",
                address: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
            };
            const interopAddress = textToBinary(text, { format: "bytes" });
            expect(interopAddress).toBeInstanceOf(Uint8Array);
            expect(interopAddress.length).toBeGreaterThan(0);
        });

        it("builds a binary InteroperableAddress without address (chain reference only)", () => {
            const text: InteroperableAddressText = {
                version: 1,
                chainType: "eip155",
                chainReference: "1",
            };
            const interopAddress = textToBinary(text, { format: "hex" });
            // Address length byte (00) is included even when address is empty
            expect(interopAddress).toBe("0x00010000010100");
        });

        it("builds a binary InteroperableAddress without chain reference (address only)", () => {
            const text: InteroperableAddressText = {
                version: 1,
                chainType: "eip155",
                address: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
            };
            const interopAddress = textToBinary(text, { format: "hex" });
            expect(interopAddress).toBe("0x000100000014d8da6bf26964af9d7eed9e03e53415d37aa96045");
        });

        it("builds a binary InteroperableAddress for Solana", () => {
            const text: InteroperableAddressText = {
                version: 1,
                chainType: "solana",
                chainReference: "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d",
                address: "MJKqp326RZCHnAAbew9MDdui3iCKWco7fsK9sVuZTX2",
            };
            const interopAddress = textToBinary(text, { format: "hex" });
            expect(typeof interopAddress).toBe("string");
            expect((interopAddress as string).startsWith("0x0001")).toBe(true);
        });

        it("uses hex format by default", () => {
            const text: InteroperableAddressText = {
                version: 1,
                chainType: "eip155",
                chainReference: "1",
                address: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
            };
            const interopAddress = textToBinary(text);
            expect(typeof interopAddress).toBe("string");
            expect((interopAddress as string).startsWith("0x")).toBe(true);
        });
    });

    describe("binaryToText", () => {
        it("converts a binary address to InteroperableAddressText", () => {
            const binaryAddress =
                "0x00010000010114d8da6bf26964af9d7eed9e03e53415d37aa96045" as BinaryAddress;
            const text = binaryToText(binaryAddress);
            expect(text).toEqual({
                version: 1,
                chainType: "eip155",
                chainReference: "1",
                address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", // Checksummed (EIP-55)
            });
        });

        it("converts a binary address without address field", () => {
            const binaryAddress = "0x00010000010100" as BinaryAddress;
            const text = binaryToText(binaryAddress);
            expect(text).toEqual({
                version: 1,
                chainType: "eip155",
                chainReference: "1",
            });
        });

        it("converts a binary address without chain reference", () => {
            const binaryAddress =
                "0x000100000014d8da6bf26964af9d7eed9e03e53415d37aa96045" as BinaryAddress;
            const text = binaryToText(binaryAddress);
            expect(text).toEqual({
                version: 1,
                chainType: "eip155",
                address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", // Checksummed (EIP-55)
            });
        });
    });

    describe("isValidInteropAddress", () => {
        it("validates an interoperable name with checksum", async () => {
            const isValid = await isValidInteropAddress(
                "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1#4CA88C9C",
            );
            expect(isValid).toBe(true);
        });

        it("validates an interoperable name without checksum", async () => {
            const isValid = await isValidInteropAddress(
                "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1",
            );
            expect(isValid).toBe(true);
        });

        it("validates a valid binary address", async () => {
            const isValid = await isValidInteropAddress(
                "0x00010000010114d8da6bf26964af9d7eed9e03e53415d37aa96045" as BinaryAddress,
            );
            expect(isValid).toBe(true);
        });

        it("rejects an invalid binary address", async () => {
            const isValid = await isValidInteropAddress(
                "0x0000010114d8da6bf26964af9d7eed9e03e53415d37aa96045" as BinaryAddress,
            );
            expect(isValid).toBe(false);
        });
    });

    describe("isValidBinaryAddress", () => {
        it("validates a valid binary address", () => {
            const isValid = isValidBinaryAddress(
                "0x00010000010114d8da6bf26964af9d7eed9e03e53415d37aa96045" as BinaryAddress,
            );
            expect(isValid).toBe(true);
        });

        it("rejects an invalid binary address", () => {
            const isValid = isValidBinaryAddress(
                "0x0000010114d8da6bf26964af9d7eed9e53415da96045" as BinaryAddress,
            );
            expect(isValid).toBe(false);
        });
    });

    describe("isValidInteroperableName", () => {
        it("validates an address with checksum", async () => {
            const isValid = await isValidInteroperableName(
                "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1#4CA88C9C",
            );
            expect(isValid).toBe(true);
        });

        it("validates an address without checksum", async () => {
            const isValid = await isValidInteroperableName(
                "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1",
            );
            expect(isValid).toBe(true);
        });
    });

    describe("getChainId", () => {
        it("gets chain ID from a binary address", async () => {
            const binaryAddress =
                "0x00010000010114d8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as BinaryAddress;

            const result = await getChainId(binaryAddress);

            expect(result).toBe("1");
        });

        it("handles different chain types", async () => {
            const testCases: BinaryAddress[] = [
                "0x00010000010114d8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as BinaryAddress, // Ethereum mainnet
                "0x000100022045296998a6f8e2a784db5d9f95e18fc23f70441a1039446801089879b08c7ef02005333498d5aea4ae009585c43f7b8c30df8e70187d4a713d134f977fc8dfe0b5" as BinaryAddress, // solana
                "0x00010000010A14DE2b660f31EA7EFE705631710379fE9D2AF02A66" as BinaryAddress, // Ethereum L2
            ];

            const expectedResults = ["1", "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d", "10"];

            for (let i = 0; i < testCases.length; i++) {
                const result = await getChainId(testCases[i] || "");
                expect(result).toBe(expectedResults[i]);
            }
        });

        it("gets chain ID from an interoperable name: mainnet", async () => {
            const interoperableName =
                "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1#4CA88C9C";
            const expected = "1";

            const result = await getChainId(interoperableName);

            expect(result).toBe(expected);
        });

        it("gets chain ID from an interoperable name: l2", async () => {
            const interoperableName =
                "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:8453#17DE0709";
            const expected = "8453";

            const result = await getChainId(interoperableName);

            expect(result).toBe(expected);
        });
    });

    describe("getAddress", () => {
        it("gets address from a binary address", async () => {
            const binaryAddress =
                "0x00010000010114d8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as BinaryAddress;

            const result = await getAddress(binaryAddress);

            expect(result).toBe("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
        });

        it("handles different chain types", async () => {
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

            for (let i = 0; i < testCases.length; i++) {
                const result = await getAddress(testCases[i] || "");
                expect(result).toBe(expectedResults[i]);
            }
        });

        it("gets address from an interoperable name", async () => {
            const interoperableName =
                "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1#4CA88C9C";
            const expected = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

            const result = await getAddress(interoperableName);

            expect(result).toBe(expected);
        });
    });
});
