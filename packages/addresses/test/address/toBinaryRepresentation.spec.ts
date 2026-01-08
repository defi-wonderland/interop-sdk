import { fromHex } from "viem";
import { describe, expect, it } from "vitest";

import { decodeAddress, encodeAddress, toBinaryRepresentation } from "../../src/address/index.js";
import { InvalidChainNamespace } from "../../src/internal.js";
import { isBinaryAddress, isTextAddress } from "../../src/types/interopAddress.js";

describe("toBinaryRepresentation", () => {
    it("converts an EVM mainnet text address to binary representation", () => {
        const text = {
            version: 1,
            chainType: "eip155" as const,
            chainReference: "1",
            address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
        };

        const interopAddress = toBinaryRepresentation(text);

        expect(interopAddress.version).toBe(1);
        expect(isBinaryAddress(interopAddress)).toBe(true);
        if (isBinaryAddress(interopAddress)) {
            expect(interopAddress.chainType).toEqual(fromHex("0x0000", "bytes"));
            expect(interopAddress.chainReference).toEqual(fromHex("0x01", "bytes"));
            expect(interopAddress.address).toEqual(
                fromHex("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "bytes"),
            );
        }
    });

    it("converts a Solana text address to binary representation", () => {
        const text = {
            version: 1,
            chainType: "solana" as const,
            chainReference: "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d",
            address: "MJKqp326RZCHnAAbew9MDdui3iCKWco7fsK9sVuZTX2",
        };

        const interopAddress = toBinaryRepresentation(text);

        expect(interopAddress.version).toBe(1);
        expect(isBinaryAddress(interopAddress)).toBe(true);
        if (isBinaryAddress(interopAddress)) {
            expect(interopAddress.chainType).toEqual(fromHex("0x0002", "bytes"));
            expect(interopAddress.chainReference).toEqual(
                fromHex(
                    "0x45296998a6f8e2a784db5d9f95e18fc23f70441a1039446801089879b08c7ef0",
                    "bytes",
                ),
            );
            expect(interopAddress.address).toEqual(
                fromHex(
                    "0x05333498d5aea4ae009585c43f7b8c30df8e70187d4a713d134f977fc8dfe0b5",
                    "bytes",
                ),
            );
        }
    });

    it("handles text address without chain reference", () => {
        const text = {
            version: 1,
            chainType: "eip155" as const,
            address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
        };

        const interopAddress = toBinaryRepresentation(text);

        expect(interopAddress.version).toBe(1);
        expect(isBinaryAddress(interopAddress)).toBe(true);
        if (isBinaryAddress(interopAddress)) {
            expect(interopAddress.chainType).toEqual(fromHex("0x0000", "bytes"));
            expect(interopAddress.chainReference).toBeUndefined();
            expect(interopAddress.address).toEqual(
                fromHex("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "bytes"),
            );
        }
    });

    it("handles text address without address", () => {
        const text = {
            version: 1,
            chainType: "eip155" as const,
            chainReference: "1",
        };

        const interopAddress = toBinaryRepresentation(text);

        expect(interopAddress.version).toBe(1);
        expect(isBinaryAddress(interopAddress)).toBe(true);
        if (isBinaryAddress(interopAddress)) {
            expect(interopAddress.chainType).toEqual(fromHex("0x0000", "bytes"));
            expect(interopAddress.chainReference).toEqual(fromHex("0x01", "bytes"));
            expect(interopAddress.address).toBeUndefined();
        }
    });

    it("converts L2 text address to binary representation", () => {
        const text = {
            version: 1,
            chainType: "eip155" as const,
            chainReference: "8453", // Base
            address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
        };

        const interopAddress = toBinaryRepresentation(text);

        expect(interopAddress.version).toBe(1);
        expect(isBinaryAddress(interopAddress)).toBe(true);
        if (isBinaryAddress(interopAddress)) {
            expect(interopAddress.chainType).toEqual(fromHex("0x0000", "bytes"));
            expect(interopAddress.chainReference).toEqual(fromHex("0x2105", "bytes"));
            expect(interopAddress.address).toEqual(
                fromHex("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "bytes"),
            );
        }
    });

    it("handles chain reference as hex string", () => {
        const text = {
            version: 1,
            chainType: "eip155" as const,
            chainReference: "0x1",
            address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
        };

        const interopAddress = toBinaryRepresentation(text);

        expect(isBinaryAddress(interopAddress)).toBe(true);
        if (isBinaryAddress(interopAddress)) {
            expect(interopAddress.chainReference).toEqual(fromHex("0x01", "bytes"));
        }
    });

    it("throws InvalidChainNamespace for invalid chain type", () => {
        const text = {
            version: 1,
            chainType: "invalid" as "eip155",
            chainReference: "1",
            address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
        };

        expect(() => toBinaryRepresentation(text)).toThrow(InvalidChainNamespace);
    });

    it("returns binary address unchanged if already binary", () => {
        const binaryAddr = decodeAddress(
            "0x00010000010114D8DA6BF26964AF9D7EED9E03E53415D37AA96045",
            {
                representation: "binary",
            },
        );

        const result = toBinaryRepresentation(binaryAddr);

        expect(result).toBe(binaryAddr);
        expect(isBinaryAddress(result)).toBe(true);
    });

    it("round-trips with decodeAddress", () => {
        const originalText = {
            version: 1,
            chainType: "eip155" as const,
            chainReference: "1",
            address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
        };

        const interopAddress = toBinaryRepresentation(originalText);
        const binary = encodeAddress(interopAddress, { format: "hex" });
        const roundTripAddress = decodeAddress(binary);

        expect(roundTripAddress.version).toEqual(originalText.version);
        if (isTextAddress(roundTripAddress)) {
            expect(roundTripAddress.chainType).toEqual(originalText.chainType);
            expect(roundTripAddress.chainReference).toEqual(originalText.chainReference);
            expect(roundTripAddress.address).toEqual(originalText.address);
        }
    });
});
