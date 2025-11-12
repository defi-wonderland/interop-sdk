import { describe, expect, it, vi } from "vitest";

import {
    buildFromPayload,
    computeChecksum,
    humanReadableToBinary,
    InteropAddressProvider,
    isValidBinaryAddress,
    isValidHumanReadableAddress,
    isValidInteropAddress,
} from "../src/providers/InteropAddressProvider.js";
import { BinaryAddress, HumanReadableAddress } from "../src/types/index.js";

const mockGetEnsName = vi.fn();
vi.mock("viem", async () => {
    const actual = await vi.importActual("viem");
    return {
        ...actual,
        createPublicClient: (): unknown => ({
            getEnsName: mockGetEnsName,
        }),
    };
});

describe("InteropAddressProvider", () => {
    describe("conversion", () => {
        it("converts a human-readable address to a binary address", async () => {
            const binaryAddress = await humanReadableToBinary(
                "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1#4CA88C9C" as HumanReadableAddress,
            );
            expect(binaryAddress).toBe("0x00010000010114d8da6bf26964af9d7eed9e03e53415d37aa96045");
        });

        // FIXME: use ERC-7828 to reverse resolution of ENS addresses
        it.skip("converts a binary address to a human-readable address", async () => {
            mockGetEnsName.mockResolvedValue("vitalik.eth");
            const humanReadableAddress = await InteropAddressProvider.binaryToHumanReadable(
                "0x00010000010114d8da6bf26964af9d7eed9e03e53415d37aa96045" as BinaryAddress,
            );
            expect(humanReadableAddress).toBe("vitalik.eth@eip155:1#4CA88C9C");
        });
    });

    describe("checksum", () => {
        it("computes the checksum of a human-readable address", async () => {
            const checksum = await computeChecksum(
                "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1",
            );
            expect(checksum).toBe("4CA88C9C");
        });
    });

    describe("buildFromPayload", () => {
        it("builds a binary InteropAddress from a payload", () => {
            const payload = {
                version: 1,
                chainType: "eip155",
                chainReference: "0x1",
                address: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
            };
            const interopAddress = buildFromPayload(payload);
            expect(interopAddress).toBe("0x00010000010114d8da6bf26964af9d7eed9e03e53415d37aa96045");
        });
    });

    describe("isValidInteropAddress", () => {
        it("validates a human-readable address with checksum", async () => {
            const isValid = await isValidInteropAddress(
                "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1#4CA88C9C",
            );
            expect(isValid).toBe(true);
        });

        it("validates a human-readable address without checksum", async () => {
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

    describe("isValidHumanReadableAddress", () => {
        it("validates an address with checksum", async () => {
            const isValid = await isValidHumanReadableAddress(
                "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1#4CA88C9C",
            );
            expect(isValid).toBe(true);
        });

        it("validates an address without checksum", async () => {
            const isValid = await isValidHumanReadableAddress(
                "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1",
            );
            expect(isValid).toBe(true);
        });
    });
});
