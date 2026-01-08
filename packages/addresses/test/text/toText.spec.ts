import { fromHex } from "viem";
import { describe, expect, it } from "vitest";

import type { InteroperableAddress } from "../../src/types/interopAddress.js";
import { UnsupportedChainType } from "../../src/internal.js";
import { toAddressText } from "../../src/text/index.js";

describe("toAddressText", () => {
    it("converts an EVM mainnet address to InteroperableAddressText", () => {
        const interopAddress: InteroperableAddress = {
            version: 1,
            chainType: fromHex("0x0000", "bytes"),
            chainReference: fromHex("0x01", "bytes"),
            address: fromHex("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "bytes"),
        };

        const text = toAddressText(interopAddress);

        expect(text).toEqual({
            version: 1,
            chainType: "eip155",
            chainReference: "1",
            address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
        });
    });

    it("converts a Solana address to InteroperableAddressText", () => {
        const interopAddress: InteroperableAddress = {
            version: 1,
            chainType: fromHex("0x0002", "bytes"),
            chainReference: fromHex(
                "0x45296998a6f8e2a784db5d9f95e18fc23f70441a1039446801089879b08c7ef0",
                "bytes",
            ),
            address: fromHex(
                "0x05333498d5aea4ae009585c43f7b8c30df8e70187d4a713d134f977fc8dfe0b5",
                "bytes",
            ),
        };

        const text = toAddressText(interopAddress);

        expect(text).toEqual({
            version: 1,
            chainType: "solana",
            chainReference: "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d",
            address: "MJKqp326RZCHnAAbew9MDdui3iCKWco7fsK9sVuZTX2",
        });
    });

    it("handles address without chain reference", () => {
        const interopAddress: InteroperableAddress = {
            version: 1,
            chainType: fromHex("0x0000", "bytes"),
            chainReference: new Uint8Array(),
            address: fromHex("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "bytes"),
        };

        const text = toAddressText(interopAddress);

        expect(text).toEqual({
            version: 1,
            chainType: "eip155",
            address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
        });
        expect(text.chainReference).toBeUndefined();
    });

    it("handles chain reference without address", () => {
        const interopAddress: InteroperableAddress = {
            version: 1,
            chainType: fromHex("0x0000", "bytes"),
            chainReference: fromHex("0x01", "bytes"),
            address: new Uint8Array(),
        };

        const text = toAddressText(interopAddress);

        expect(text).toEqual({
            version: 1,
            chainType: "eip155",
            chainReference: "1",
        });
        expect(text.address).toBeUndefined();
    });

    it("handles empty chain reference and address", () => {
        const interopAddress: InteroperableAddress = {
            version: 1,
            chainType: fromHex("0x0000", "bytes"),
            chainReference: new Uint8Array(),
            address: new Uint8Array(),
        };

        const text = toAddressText(interopAddress);

        expect(text).toEqual({
            version: 1,
            chainType: "eip155",
        });
        expect(text.chainReference).toBeUndefined();
        expect(text.address).toBeUndefined();
    });

    it("converts L2 address to InteroperableAddressText", () => {
        const interopAddress: InteroperableAddress = {
            version: 1,
            chainType: fromHex("0x0000", "bytes"),
            chainReference: fromHex("0x2105", "bytes"), // Base chain ID (8453)
            address: fromHex("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "bytes"),
        };

        const text = toAddressText(interopAddress);

        expect(text).toEqual({
            version: 1,
            chainType: "eip155",
            chainReference: "8453",
            address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
        });
    });

    it("throws UnsupportedChainType for invalid chain type", () => {
        const interopAddress: InteroperableAddress = {
            version: 1,
            chainType: fromHex("0xffff", "bytes"), // Invalid chain type
            chainReference: fromHex("0x01", "bytes"),
            address: fromHex("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "bytes"),
        };

        expect(() => toAddressText(interopAddress)).toThrow(UnsupportedChainType);
    });
});
