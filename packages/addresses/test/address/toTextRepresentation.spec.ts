import { describe, expect, it } from "vitest";

import { decodeAddress, encodeAddress, toTextRepresentation } from "../../src/address/index.js";
import { isTextAddress } from "../../src/types/interopAddress.js";

describe("toTextRepresentation", () => {
    it("converts a binary address to text representation", () => {
        const binaryAddr = decodeAddress(
            "0x00010000010114D8DA6BF26964AF9D7EED9E03E53415D37AA96045",
            {
                representation: "binary",
            },
        );

        const textAddr = toTextRepresentation(binaryAddr);

        expect(textAddr.version).toBe(1);
        expect(isTextAddress(textAddr)).toBe(true);
        if (isTextAddress(textAddr)) {
            expect(textAddr.chainType).toEqual("eip155");
            expect(textAddr.chainReference).toEqual("1");
            expect(textAddr.address).toEqual("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
        }
    });

    it("converts a Solana binary address to text representation", () => {
        const binaryAddr = decodeAddress(
            "0x000100022045296998a6f8e2a784db5d9f95e18fc23f70441a1039446801089879b08c7ef02005333498d5aea4ae009585c43f7b8c30df8e70187d4a713d134f977fc8dfe0b5",
            { representation: "binary" },
        );

        const textAddr = toTextRepresentation(binaryAddr);

        expect(textAddr.version).toBe(1);
        expect(isTextAddress(textAddr)).toBe(true);
        if (isTextAddress(textAddr)) {
            expect(textAddr.chainType).toEqual("solana");
            expect(textAddr.chainReference).toEqual("5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d");
            expect(textAddr.address).toEqual("MJKqp326RZCHnAAbew9MDdui3iCKWco7fsK9sVuZTX2");
        }
    });

    it("handles binary address without chain reference", () => {
        const binaryAddr = decodeAddress("0x000100000014D8DA6BF26964AF9D7EED9E03E53415D37AA96045", {
            representation: "binary",
        });

        const textAddr = toTextRepresentation(binaryAddr);

        expect(textAddr.version).toBe(1);
        expect(isTextAddress(textAddr)).toBe(true);
        if (isTextAddress(textAddr)) {
            expect(textAddr.chainType).toEqual("eip155");
            expect(textAddr.chainReference).toBeUndefined();
            expect(textAddr.address).toEqual("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
        }
    });

    it("handles binary address without address", () => {
        const binaryAddr = decodeAddress(
            "0x000100022045296998a6f8e2a784db5d9f95e18fc23f70441a1039446801089879b08c7ef000",
            { representation: "binary" },
        );

        const textAddr = toTextRepresentation(binaryAddr);

        expect(textAddr.version).toBe(1);
        expect(isTextAddress(textAddr)).toBe(true);
        if (isTextAddress(textAddr)) {
            expect(textAddr.chainType).toEqual("solana");
            expect(textAddr.chainReference).toEqual("5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d");
            expect(textAddr.address).toBeUndefined();
        }
    });

    it("returns text address unchanged if already text", () => {
        const textAddr = {
            version: 1,
            chainType: "eip155" as const,
            chainReference: "1",
            address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
        };

        const result = toTextRepresentation(textAddr);

        expect(result).toBe(textAddr);
        expect(isTextAddress(result)).toBe(true);
    });

    it("round-trips with encodeAddress", () => {
        const binaryAddr = decodeAddress(
            "0x00010000010114D8DA6BF26964AF9D7EED9E03E53415D37AA96045",
            {
                representation: "binary",
            },
        );

        const textAddr = toTextRepresentation(binaryAddr);
        const binary = encodeAddress(textAddr, { format: "hex" });
        const roundTripBinary = decodeAddress(binary, { representation: "binary" });

        expect(roundTripBinary.version).toEqual(binaryAddr.version);
        if (
            roundTripBinary.chainType instanceof Uint8Array &&
            binaryAddr.chainType instanceof Uint8Array
        ) {
            expect(roundTripBinary.chainType).toEqual(binaryAddr.chainType);
            expect(roundTripBinary.chainReference).toEqual(binaryAddr.chainReference);
            expect(roundTripBinary.address).toEqual(binaryAddr.address);
        }
    });
});
