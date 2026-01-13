import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    InvalidChainIdentifier,
    InvalidChainType,
    MissingInteroperableName,
} from "../../src/internal.js";
import { parseName } from "../../src/name/index.js";
import { isTextAddress } from "../../src/types/interopAddress.js";

const { mockShortnameToChainId } = vi.hoisted(() => {
    const mockShortnameToChainId = vi.fn();
    return { mockShortnameToChainId };
});

vi.mock("../../src/name/shortnameToChainId.js", () => ({
    shortnameToChainId: mockShortnameToChainId,
}));

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

describe("parseName", () => {
    beforeEach(() => {
        mockGetEnsAddress.mockClear();
        mockShortnameToChainId.mockClear();
    });

    it("parses a valid EVM address with checksum", async () => {
        const name = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1#4CA88C9C";

        const result = await parseName(name);

        expect(result.interoperableAddress.version).toBe(1);
        expect(isTextAddress(result.interoperableAddress)).toBe(true);
        if (isTextAddress(result.interoperableAddress)) {
            expect(result.interoperableAddress.chainType).toBe("eip155");
            expect(result.interoperableAddress.chainReference).toBe("1");
            expect(result.interoperableAddress.address).toBe(
                "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
            );
        }
        expect(result.meta.checksum).toBe("4CA88C9C");
        expect(result.meta.isENS).toBe(false);
        expect(result.meta.isChainLabel).toBe(false);
    });

    it("parses a valid EVM address without checksum", async () => {
        const name = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1";

        const result = await parseName(name);

        expect(result.interoperableAddress.version).toBe(1);
        expect(isTextAddress(result.interoperableAddress)).toBe(true);
        if (isTextAddress(result.interoperableAddress)) {
            expect(result.interoperableAddress.chainType).toBe("eip155");
            expect(result.interoperableAddress.chainReference).toBe("1");
            expect(result.interoperableAddress.address).toBe(
                "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
            );
        }
        // Checksum is always calculated, even if not provided
        expect(result.meta.checksum).toBeDefined();
        expect(typeof result.meta.checksum).toBe("string");
        expect(result.meta.checksumMismatch).toBeUndefined();
        expect(result.meta.isENS).toBe(false);
        expect(result.meta.isChainLabel).toBe(false);
    });

    it("parses a Solana address", async () => {
        const name =
            "MJKqp326RZCHnAAbew9MDdui3iCKWco7fsK9sVuZTX2@solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d#88835C11";

        const result = await parseName(name);

        expect(result.interoperableAddress.version).toBe(1);
        expect(isTextAddress(result.interoperableAddress)).toBe(true);
        if (isTextAddress(result.interoperableAddress)) {
            expect(result.interoperableAddress.chainType).toBe("solana");
            expect(result.interoperableAddress.chainReference).toBe(
                "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d",
            );
            expect(result.interoperableAddress.address).toBe(
                "MJKqp326RZCHnAAbew9MDdui3iCKWco7fsK9sVuZTX2",
            );
        }
        expect(result.meta.checksum).toBe("88835C11");
        expect(result.meta.isENS).toBe(false);
        expect(result.meta.isChainLabel).toBe(false); // chainType is provided, so no chain label resolution was needed
    });

    it("parses address without chain reference", async () => {
        const name = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155";

        const result = await parseName(name);

        expect(result.interoperableAddress.version).toBe(1);
        expect(isTextAddress(result.interoperableAddress)).toBe(true);
        if (isTextAddress(result.interoperableAddress)) {
            expect(result.interoperableAddress.chainType).toBe("eip155");
            expect(result.interoperableAddress.address).toBe(
                "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
            );
            expect(result.interoperableAddress.chainReference).toBeUndefined();
        }
    });

    it("parses address without address field", async () => {
        const name = "@eip155:1#F54D4FBF";

        const result = await parseName(name);

        expect(result.interoperableAddress.version).toBe(1);
        expect(isTextAddress(result.interoperableAddress)).toBe(true);
        if (isTextAddress(result.interoperableAddress)) {
            expect(result.interoperableAddress.chainType).toBe("eip155");
            expect(result.interoperableAddress.chainReference).toBe("1");
            expect(result.interoperableAddress.address).toBeUndefined();
        }
    });

    it("preserves chain reference when both chainType and chainReference are provided", async () => {
        const name = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1#4CA88C9C";

        const result = await parseName(name);

        // When both chainType and chainReference are provided, no resolution occurs
        if (isTextAddress(result.interoperableAddress)) {
            expect(result.interoperableAddress.chainReference).toBe("1");
        }
        expect(result.meta.isChainLabel).toBe(false); // "1" is numeric, not a label
    });

    it("resolves chain shortname to chain ID when only chainReference is provided", async () => {
        mockShortnameToChainId.mockResolvedValue(1);
        const name = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eth#4CA88C9C";

        const result = await parseName(name);

        // When only chainReference is provided, it should be resolved to chainType/reference
        if (isTextAddress(result.interoperableAddress)) {
            expect(result.interoperableAddress.chainType).toBe("eip155");
            expect(result.interoperableAddress.chainReference).toBe("1");
        }
        expect(result.meta.isChainLabel).toBe(true); // "eth" is a chain label
        expect(mockShortnameToChainId).toHaveBeenCalledWith("eth");
    });

    it("correctly identifies chain label when only chainReference is provided (no chainType)", async () => {
        mockShortnameToChainId.mockResolvedValue(42161);
        const name = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@arbitrum#4CA88C9C";

        const result = await parseName(name);

        // When only chainReference is provided (no chainType), isChainLabel should be true
        // because the chainReference needs to be resolved to a chainType
        expect(result.meta.isChainLabel).toBe(true);
        expect(result.name.chainType).toBeUndefined(); // Original parsed name has no chainType
        expect(result.name.chainReference).toBe("arbitrum"); // Original parsed name has the label
        if (isTextAddress(result.interoperableAddress)) {
            expect(result.interoperableAddress.chainType).toBe("eip155"); // Resolved chainType
            expect(result.interoperableAddress.chainReference).toBe("42161"); // Resolved chainReference
        }
        expect(mockShortnameToChainId).toHaveBeenCalledWith("arbitrum");
    });

    it("throws MissingInteroperableName for empty string", async () => {
        await expect(parseName("")).rejects.toThrow(MissingInteroperableName);
        await expect(parseName("   ")).rejects.toThrow(MissingInteroperableName);
    });

    it("throws InvalidChainType for invalid chain type", async () => {
        const name = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@invalid:1#4CA88C9C";

        await expect(parseName(name)).rejects.toThrow(InvalidChainType);
    });

    it("throws InvalidChainIdentifier for invalid chain reference", async () => {
        // Use a chain reference that is not numeric (can't be converted to a valid chain ID)
        // Mock shortnameToChainId to return null so it falls back to the original value
        mockShortnameToChainId.mockResolvedValue(null);
        const name = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:not-a-number#4CA88C9C";

        await expect(parseName(name)).rejects.toThrow(InvalidChainIdentifier);
    });

    it("throws error for invalid checksum format", async () => {
        const name = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1#INVALID";

        // The error message comes from the parsing layer, not the schema validation
        await expect(parseName(name)).rejects.toThrow();
    });

    it("handles ENS names and marks isENS", async () => {
        const resolvedAddress = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
        mockGetEnsAddress.mockResolvedValue(resolvedAddress);
        const name = "vitalik.eth@eip155:1#4CA88C9C";

        const result = await parseName(name);

        // Resolved address is used in address
        if (isTextAddress(result.interoperableAddress)) {
            expect(result.interoperableAddress.address).toBe(resolvedAddress);
        }
        expect(result.name.address).toBe("vitalik.eth"); // Original is preserved in name field
        expect(result.meta.isENS).toBe(true);
        expect(result.meta.isChainLabel).toBe(false);
    });

    it("throws error when only chainType is provided (no address or chain reference)", async () => {
        const name = "@eip155";

        await expect(parseName(name)).rejects.toThrow(
            "InteroperableAddress must have at least one of chainReference or address",
        );
    });

    it("can parse to binary representation", async () => {
        const name = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1#4CA88C9C";

        const result = await parseName(name, { representation: "binary" });

        expect(result.interoperableAddress.version).toBe(1);
        expect(result.interoperableAddress.chainType instanceof Uint8Array).toBe(true);
        if (result.interoperableAddress.chainType instanceof Uint8Array) {
            expect(result.interoperableAddress.chainReference instanceof Uint8Array).toBe(true);
            expect(result.interoperableAddress.address instanceof Uint8Array).toBe(true);
        }
    });
});
