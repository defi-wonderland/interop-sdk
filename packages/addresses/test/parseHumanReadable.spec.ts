import bs58 from "bs58";
import { hexToBytes } from "viem";
import { describe, expect, it, vi } from "vitest";

import type { InteropAddress } from "../src/internal.js";
import {
    ENSLookupFailed,
    ENSNotFound,
    InvalidChainIdentifier,
    InvalidChainNamespace,
    InvalidChecksum,
    InvalidHumanReadableAddress,
    MissingHumanReadableAddress,
    parseHumanReadable,
} from "../src/internal.js";

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

describe("erc7930", () => {
    describe("parseHumanReadable", () => {
        it("convert EVM mainnet address to interop address", async () => {
            const humanReadableAddress =
                "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1#4CA88C9C";
            const expected: InteropAddress = {
                version: 1,
                chainType: hexToBytes("0x0000"),
                chainReference: hexToBytes("0x01"),
                address: hexToBytes("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"),
            };

            const interopAddress = await parseHumanReadable(humanReadableAddress);

            expect(interopAddress).toEqual(expected);
        });

        it("convert L2 address to interop address", async () => {
            const humanReadableAddress =
                "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:8453#17DE0709";
            const expected: InteropAddress = {
                version: 1,
                chainType: hexToBytes("0x0000"),
                chainReference: hexToBytes("0x2105"),
                address: hexToBytes("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"),
            };

            const interopAddress = await parseHumanReadable(humanReadableAddress);

            expect(interopAddress).toEqual(expected);
        });

        it("converts solana address to interop address", async () => {
            const humanReadableAddress =
                "MJKqp326RZCHnAAbew9MDdui3iCKWco7fsK9sVuZTX2@solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d#88835C11";
            const expected: InteropAddress = {
                version: 1,
                chainType: hexToBytes("0x0002"),
                chainReference: hexToBytes(
                    "0x45296998a6f8e2a784db5d9f95e18fc23f70441a1039446801089879b08c7ef0",
                ),
                address: hexToBytes(
                    "0x05333498d5aea4ae009585c43f7b8c30df8e70187d4a713d134f977fc8dfe0b5",
                ),
            };

            const interopAddress = await parseHumanReadable(humanReadableAddress);

            expect(interopAddress).toEqual(expected);
        });

        it("converts human readable address without account id to interop address", async () => {
            const humanReadableAddress = "@eip155:1#F54D4FBF";
            const expected: InteropAddress = {
                version: 1,
                chainType: hexToBytes("0x0000"),
                chainReference: hexToBytes("0x01"),
                address: new Uint8Array(),
            };
            await expect(parseHumanReadable(humanReadableAddress)).resolves.toEqual(expected);
        });

        it("parse human readable address without chain reference to interop address", async () => {
            const humanReadableAddress =
                "MJKqp326RZCHnAAbew9MDdui3iCKWco7fsK9sVuZTX2@solana:#18D1CBB4";
            const expected: InteropAddress = {
                version: 1,
                chainType: hexToBytes("0x0002"),
                chainReference: new Uint8Array(),
                address: bs58.decode("MJKqp326RZCHnAAbew9MDdui3iCKWco7fsK9sVuZTX2"),
            };
            const interopAddress = await parseHumanReadable(humanReadableAddress);

            expect(interopAddress).toEqual(expected);
        });

        it("parse human readable address without chain reference and address to interop address", async () => {
            const humanReadableAddress = "@solana:#F40BB840";
            const expected: InteropAddress = {
                version: 1,
                chainType: hexToBytes("0x0002"),
                chainReference: new Uint8Array(),
                address: new Uint8Array(),
            };
            const interopAddress = await parseHumanReadable(humanReadableAddress);

            expect(interopAddress).toEqual(expected);
        });

        it("convert ENS name to interop address", async () => {
            const humanReadableAddress = "vitalik.eth@eip155:1#4CA88C9C";
            const expected: InteropAddress = {
                version: 1,
                chainType: hexToBytes("0x0000"),
                chainReference: hexToBytes("0x01"),
                address: hexToBytes("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"),
            };

            mockGetEnsAddress.mockResolvedValue("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
            const interopAddress = await parseHumanReadable(humanReadableAddress);

            expect(interopAddress).toEqual(expected);
        });

        it("allows hyphens in ENS name", async () => {
            const humanReadableAddress = "ens-with-hyphens.eth@eip155:1#4CA88C9C";
            const expected: InteropAddress = {
                version: 1,
                chainType: hexToBytes("0x0000"),
                chainReference: hexToBytes("0x01"),
                address: hexToBytes("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"),
            };

            mockGetEnsAddress.mockResolvedValue("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
            const interopAddress = await parseHumanReadable(humanReadableAddress);

            expect(interopAddress).toEqual(expected);
        });

        it("throws error if ENS name not found", async () => {
            const humanReadableAddress = "notfoundensname.eth@eip155:1#4CA88C9C";
            mockGetEnsAddress.mockRejectedValue(new ENSNotFound(humanReadableAddress));
            await expect(parseHumanReadable(humanReadableAddress)).rejects.toThrow(ENSNotFound);
        });

        it("throws error if ENS lookup fails", async () => {
            const humanReadableAddress = "notfoundensname.eth@eip155:1#4CA88C9C";
            mockGetEnsAddress.mockRejectedValue(new ENSLookupFailed(humanReadableAddress));
            await expect(parseHumanReadable(humanReadableAddress)).rejects.toThrow(ENSLookupFailed);
        });

        it("throws error if chain is invalid", async () => {
            const humanReadableAddress = "vitalik.eth@eip155:1000000#4CA88C9C";
            await expect(parseHumanReadable(humanReadableAddress)).rejects.toThrow("Invalid chain");
        });

        it("throws error if checksum is invalid", async () => {
            const humanReadableAddress =
                "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1#FFFFFFFF";
            await expect(parseHumanReadable(humanReadableAddress)).rejects.toThrow(InvalidChecksum);
        });

        it("throws if chain reference is invalid", async () => {
            const humanReadableAddress =
                "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1000000#4CA88C9C";
            await expect(parseHumanReadable(humanReadableAddress)).rejects.toThrow(
                InvalidChainIdentifier,
            );
        });

        it("throws if address is invalid", async () => {
            const humanReadableAddress =
                "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045:eip155:1#4CA88C9C";
            await expect(parseHumanReadable(humanReadableAddress)).rejects.toThrow(
                InvalidHumanReadableAddress,
            );
        });

        it("throws if address is empty", async () => {
            const humanReadableAddress = "";
            await expect(parseHumanReadable(humanReadableAddress)).rejects.toThrow(
                MissingHumanReadableAddress,
            );
        });

        it("default to eip155 if chain namespace is not provided", async () => {
            const humanReadableAddress = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@8453#17DE0709";
            const expected: InteropAddress = {
                version: 1,
                chainType: hexToBytes("0x0000"),
                chainReference: hexToBytes("0x2105"),
                address: hexToBytes("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"),
            };
            const interopAddress = await parseHumanReadable(humanReadableAddress);

            expect(interopAddress).toEqual(expected);
        });

        it("throws if chain namespace is invalid", async () => {
            const humanReadableAddress =
                "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@foo:1#17DE0709";
            await expect(parseHumanReadable(humanReadableAddress)).rejects.toThrow(
                InvalidChainNamespace,
            );
        });
    });
});
