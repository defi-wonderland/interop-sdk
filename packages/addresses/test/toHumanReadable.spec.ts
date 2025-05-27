import bs58 from "bs58";
import { hexToBytes } from "viem";
import { describe, expect, it, vi } from "vitest";

import type { InteropAddress } from "../src/internal.js";
import { toHumanReadable, UnsupportedChainType } from "../src/internal.js";

const mockGetEnsAddress = vi.fn();
const mockGetEnsName = vi.fn();
vi.mock("viem", async () => {
    const actual = await vi.importActual("viem");
    return {
        ...actual,
        createPublicClient: (): unknown => ({
            getEnsAddress: mockGetEnsAddress,
            getEnsName: mockGetEnsName,
        }),
    };
});

describe("erc7930", () => {
    describe("toHumanReadable", () => {
        it("convert interop address to human readable", async () => {
            const interopAddress: InteropAddress = {
                version: 1,
                chainType: hexToBytes("0x0000"),
                chainReference: hexToBytes("0x01"),
                address: hexToBytes("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"),
            };

            const humanReadableAddress = await toHumanReadable(interopAddress);

            expect(humanReadableAddress).toEqual(
                "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1#4CA88C9C",
            );
        });

        it("convert solana interop address to human readable", async () => {
            const interopAddress: InteropAddress = {
                version: 1,
                chainType: hexToBytes("0x0002"),
                chainReference: hexToBytes(
                    "0x45296998a6f8e2a784db5d9f95e18fc23f70441a1039446801089879b08c7ef0",
                ),
                address: hexToBytes(
                    "0x05333498d5aea4ae009585c43f7b8c30df8e70187d4a713d134f977fc8dfe0b5",
                ),
            };

            const humanReadableAddress = await toHumanReadable(interopAddress);

            expect(humanReadableAddress).toEqual(
                "MJKqp326RZCHnAAbew9MDdui3iCKWco7fsK9sVuZTX2@solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d#88835C11",
            );
        });

        it("correctly format without address", async () => {
            const interopAddress: InteropAddress = {
                version: 1,
                chainType: hexToBytes("0x0000"),
                chainReference: hexToBytes("0x01"),
                address: new Uint8Array(),
            };

            const humanReadableAddress = await toHumanReadable(interopAddress);

            expect(humanReadableAddress).toEqual("@eip155:1#F54D4FBF");
        });

        it("correctly format without chain reference", async () => {
            const interopAddress: InteropAddress = {
                version: 1,
                chainType: hexToBytes("0x0002"),
                chainReference: new Uint8Array(),
                address: bs58.decode("MJKqp326RZCHnAAbew9MDdui3iCKWco7fsK9sVuZTX2"),
            };
            const expected = "MJKqp326RZCHnAAbew9MDdui3iCKWco7fsK9sVuZTX2@solana:#18D1CBB4";

            expect(await toHumanReadable(interopAddress)).toBe(expected);
        });

        it("should correctly format without chain reference and address", async () => {
            const interopAddress: InteropAddress = {
                version: 1,
                chainType: hexToBytes("0x0002"),
                chainReference: new Uint8Array(),
                address: new Uint8Array(),
            };
            const expected = "@solana:#F40BB840";

            expect(await toHumanReadable(interopAddress)).toBe(expected);
        });

        it("correctly format EVM rollup address", async () => {
            const interopAddress: InteropAddress = {
                version: 1,
                chainType: hexToBytes("0x0000"),
                chainReference: hexToBytes("0xa"),
                address: hexToBytes("0xD46acbA18e4f3C8b8b6c501DF1a6B05609a642Bd"),
            };

            const expected = "0xD46acbA18e4f3C8b8b6c501DF1a6B05609a642Bd@eip155:10#CCA85AD3";
            expect(await toHumanReadable(interopAddress)).toBe(expected);
        });

        it("throw an error if the chain type is not supported", async () => {
            const interopAddress: InteropAddress = {
                version: 1,
                chainType: hexToBytes("0xffff"), // invalid chain type
                chainReference: hexToBytes("0x01"),
                address: hexToBytes("0xD46acbA18e4f3C8b8b6c501DF1a6B05609a642Bd"),
            };

            await expect(toHumanReadable(interopAddress)).rejects.toThrow(UnsupportedChainType);
        });

        it("convert ENS name to human readable", async () => {
            const interopAddress: InteropAddress = {
                version: 1,
                chainType: hexToBytes("0x0000"),
                chainReference: hexToBytes("0x01"),
                address: hexToBytes("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"),
            };

            mockGetEnsName.mockResolvedValue("vitalik.eth");
            const humanReadableAddress = await toHumanReadable(interopAddress);

            expect(humanReadableAddress).toEqual("vitalik.eth@eip155:1#4CA88C9C");
        });

        it("returns hex address if ENS name is not found", async () => {
            const interopAddress: InteropAddress = {
                version: 1,
                chainType: hexToBytes("0x0000"),
                chainReference: hexToBytes("0x01"),
                address: hexToBytes("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"),
            };

            mockGetEnsName.mockResolvedValue(null);

            expect(await toHumanReadable(interopAddress)).toBe(
                "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1#4CA88C9C",
            );
        });
    });
});
