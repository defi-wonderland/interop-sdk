import { hexToBytes } from "viem";
import { describe, expect, it, vi } from "vitest";

import type { InteropAddress } from "../src/internal.js";
import { parseHumanReadable } from "../src/internal.js";

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
            mockGetEnsAddress.mockRejectedValue(new Error("ENS name not found"));
            await expect(parseHumanReadable(humanReadableAddress)).rejects.toThrow(
                "ENS name not found",
            );
        });

        it("throws error if chain is invalid", async () => {
            const humanReadableAddress = "vitalik.eth@eip155:1000000#4CA88C9C";
            await expect(parseHumanReadable(humanReadableAddress)).rejects.toThrow("Invalid chain");
        });
    });
});
