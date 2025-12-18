import { fromHex, getAddress, Hex } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    buildInteropAddress,
    CHAIN_TYPE,
    ENSNotFound,
    InvalidAddress,
    InvalidChainReference,
    UnsupportedChainType,
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

describe("buildInteropAddress", () => {
    beforeEach(() => {
        mockGetEnsAddress.mockClear();
    });
    it("build an InteropAddress from a eip155 address", async () => {
        const interopAddress = await buildInteropAddress({
            version: 1,
            chainType: "eip155",
            chainReference: "0x1",
            address: "0x0000000000000000000000000000000000000001",
        });

        expect(interopAddress).toBeDefined();
        expect(interopAddress.version).toBe(1);
        expect(interopAddress.chainType).toEqual(fromHex(CHAIN_TYPE["eip155"] as Hex, "bytes"));
        expect(interopAddress.chainReference).toEqual(fromHex("0x1", "bytes"));
        expect(interopAddress.address).toEqual(
            fromHex("0x0000000000000000000000000000000000000001", "bytes"),
        );
    });

    it("build an InteropAddress from a solana address", async () => {
        const interopAddress = await buildInteropAddress({
            version: 1,
            chainType: "solana",
            chainReference: "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d",
            address: "MJKqp326RZCHnAAbew9MDdui3iCKWco7fsK9sVuZTX2",
        });

        expect(interopAddress).toBeDefined();
        expect(interopAddress.version).toBe(1);
        expect(interopAddress.chainType).toEqual(fromHex(CHAIN_TYPE["solana"] as Hex, "bytes"));
        expect(interopAddress.chainReference).toEqual(
            fromHex("0x45296998a6f8e2a784db5d9f95e18fc23f70441a1039446801089879b08c7ef0", "bytes"),
        );
        expect(interopAddress.address).toEqual(
            fromHex("0x05333498d5aea4ae009585c43f7b8c30df8e70187d4a713d134f977fc8dfe0b5", "bytes"),
        );
    });

    it("builds an InteropAddress without a chain reference (address only)", async () => {
        const interopAddress = await buildInteropAddress({
            version: 1,
            chainType: "eip155",
            address: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
        });

        expect(interopAddress).toBeDefined();
        expect(interopAddress.version).toBe(1);
        expect(interopAddress.chainType).toEqual(fromHex(CHAIN_TYPE["eip155"] as Hex, "bytes"));
        expect(interopAddress.chainReference).toEqual(new Uint8Array());
        expect(interopAddress.address).toEqual(
            fromHex("0xd8da6bf26964af9d7eed9e03e53415d37aa96045", "bytes"),
        );
    });

    it("builds an InteropAddress without an address (chain reference only)", async () => {
        const interopAddress = await buildInteropAddress({
            version: 1,
            chainType: "eip155",
            chainReference: "0x1",
        });

        expect(interopAddress).toBeDefined();
        expect(interopAddress.version).toBe(1);
        expect(interopAddress.chainType).toEqual(fromHex(CHAIN_TYPE["eip155"] as Hex, "bytes"));
        expect(interopAddress.chainReference).toEqual(fromHex("0x1", "bytes"));
        expect(interopAddress.address).toEqual(new Uint8Array());
    });

    it("throws error if chain type is not supported", async () => {
        await expect(
            buildInteropAddress({
                version: 1,
                chainType: "not-supported",
                chainReference: "0x1",
                address: "0x1",
            }),
        ).rejects.toThrow(UnsupportedChainType);
    });

    it("throw error if chain reference is not a valid number, hex, or chain label when chain type is eip155", async () => {
        await expect(
            buildInteropAddress({
                version: 1,
                chainType: "eip155",
                chainReference: "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d",
                address: "0x1",
            }),
        ).rejects.toThrow(InvalidChainReference);
    });

    it("throw error if chain reference is not base58 when chain type is solana", async () => {
        await expect(
            buildInteropAddress({
                version: 1,
                chainType: "solana",
                chainReference: "0x1",
                address: "0x1",
            }),
        ).rejects.toThrow(InvalidChainReference);
    });

    it("throw error if address is not hex when chain type is eip155", async () => {
        await expect(
            buildInteropAddress({
                version: 1,
                chainType: "eip155",
                chainReference: "0x1",
                address: "MJKqp326RZCHnAAbew9MDdui3iCKWco7fsK9sVuZTX2",
            }),
        ).rejects.toThrow(InvalidAddress);
    });

    it("throw error if address is not base58 when chain type is solana", async () => {
        await expect(
            buildInteropAddress({
                version: 1,
                chainType: "solana",
                chainReference: "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d",
                address: "0x1",
            }),
        ).rejects.toThrow(InvalidAddress);
    });

    it("accepts decimal chain reference for eip155", async () => {
        const interopAddress = await buildInteropAddress({
            version: 1,
            chainType: "eip155",
            chainReference: "1",
            address: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
        });

        expect(interopAddress.chainReference).toEqual(fromHex("0x1", "bytes"));
    });

    it("resolves chain shortname 'base' to chain ID 8453", async () => {
        const interopAddress = await buildInteropAddress({
            version: 1,
            chainType: "eip155",
            chainReference: "base",
            address: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
        });

        // Base chain ID 8453 is 0x2105 in hex
        expect(interopAddress.chainReference).toEqual(fromHex("0x2105", "bytes"));
    });

    it("resolves ENS name and builds InteropAddress", async () => {
        mockGetEnsAddress.mockResolvedValue("0xd8da6bf26964af9d7eed9e03e53415d37aa96045");

        const interopAddress = await buildInteropAddress({
            version: 1,
            chainType: "eip155",
            chainReference: "0x1",
            address: "vitalik.eth",
        });

        expect(interopAddress.address).toEqual(
            fromHex("0xd8da6bf26964af9d7eed9e03e53415d37aa96045", "bytes"),
        );
    });

    it("throws ENSNotFound when ENS name cannot be resolved", async () => {
        mockGetEnsAddress.mockResolvedValue(null);

        await expect(
            buildInteropAddress({
                version: 1,
                chainType: "eip155",
                chainReference: "0x1",
                address: "nonexistent.eth",
            }),
        ).rejects.toThrow(ENSNotFound);
    });

    it("throws InvalidAddress when EIP-155 address is not a valid Ethereum address", async () => {
        await expect(
            buildInteropAddress({
                version: 1,
                chainType: "eip155",
                chainReference: "0x1",
                // Too short to be a valid Ethereum address
                address: "0x1234",
            }),
        ).rejects.toThrow(InvalidAddress);
    });

    describe("address checksum normalization", () => {
        it("normalizes lowercase address to checksummed format", async () => {
            const lowercaseAddress = "0xd8da6bf26964af9d7eed9e03e53415d37aa96045";
            const checksummedAddress = getAddress(lowercaseAddress);

            const interopAddress = await buildInteropAddress({
                version: 1,
                chainType: "eip155",
                chainReference: "0x1",
                address: lowercaseAddress,
            });

            // Verify the address is normalized to checksummed format
            expect(interopAddress.address).toEqual(fromHex(checksummedAddress, "bytes"));
        });

        it("normalizes mixed-case address to checksummed format", async () => {
            const mixedCaseAddress = "0xD8DA6BF26964AF9D7EED9E03E53415D37AA96045";
            const checksummedAddress = getAddress(mixedCaseAddress);

            const interopAddress = await buildInteropAddress({
                version: 1,
                chainType: "eip155",
                chainReference: "0x1",
                address: mixedCaseAddress,
            });

            // Verify the address is normalized to checksummed format
            expect(interopAddress.address).toEqual(fromHex(checksummedAddress, "bytes"));
        });

        it("accepts already checksummed address and preserves it", async () => {
            const checksummedAddress = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

            const interopAddress = await buildInteropAddress({
                version: 1,
                chainType: "eip155",
                chainReference: "0x1",
                address: checksummedAddress,
            });

            // Verify the checksummed address is preserved
            expect(interopAddress.address).toEqual(fromHex(checksummedAddress, "bytes"));
        });
    });
});
