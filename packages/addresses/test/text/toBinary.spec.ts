import { fromHex } from "viem";
import { describe, expect, it } from "vitest";

import type { InteroperableAddressText } from "../../src/types/interopAddress.js";
import { InvalidChainNamespace } from "../../src/internal.js";
import { toAddress, toAddressText } from "../../src/text/index.js";

describe("toAddress", () => {
    it("converts an EVM mainnet InteroperableAddressText to InteroperableAddress", () => {
        const text: InteroperableAddressText = {
            version: 1,
            chainType: "eip155",
            chainReference: "1",
            address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
        };

        const interopAddress = toAddress(text);

        expect(interopAddress.version).toBe(1);
        expect(interopAddress.chainType).toEqual(fromHex("0x0000", "bytes"));
        expect(interopAddress.chainReference).toEqual(fromHex("0x01", "bytes"));
        expect(interopAddress.address).toEqual(
            fromHex("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "bytes"),
        );
    });

    it("converts a Solana InteroperableAddressText to InteroperableAddress", () => {
        const text: InteroperableAddressText = {
            version: 1,
            chainType: "solana",
            chainReference: "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d",
            address: "MJKqp326RZCHnAAbew9MDdui3iCKWco7fsK9sVuZTX2",
        };

        const interopAddress = toAddress(text);

        expect(interopAddress.version).toBe(1);
        expect(interopAddress.chainType).toEqual(fromHex("0x0002", "bytes"));
        expect(interopAddress.chainReference).toEqual(
            fromHex("0x45296998a6f8e2a784db5d9f95e18fc23f70441a1039446801089879b08c7ef0", "bytes"),
        );
        expect(interopAddress.address).toEqual(
            fromHex("0x05333498d5aea4ae009585c43f7b8c30df8e70187d4a713d134f977fc8dfe0b5", "bytes"),
        );
    });

    it("handles InteroperableAddressText without chain reference", () => {
        const text: InteroperableAddressText = {
            version: 1,
            chainType: "eip155",
            address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
        };

        const interopAddress = toAddress(text);

        expect(interopAddress.version).toBe(1);
        expect(interopAddress.chainType).toEqual(fromHex("0x0000", "bytes"));
        expect(interopAddress.chainReference).toEqual(new Uint8Array());
        expect(interopAddress.address).toEqual(
            fromHex("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "bytes"),
        );
    });

    it("handles InteroperableAddressText without address", () => {
        const text: InteroperableAddressText = {
            version: 1,
            chainType: "eip155",
            chainReference: "1",
        };

        const interopAddress = toAddress(text);

        expect(interopAddress.version).toBe(1);
        expect(interopAddress.chainType).toEqual(fromHex("0x0000", "bytes"));
        expect(interopAddress.chainReference).toEqual(fromHex("0x01", "bytes"));
        expect(interopAddress.address).toEqual(new Uint8Array());
    });

    it("handles InteroperableAddressText without chain reference and address", () => {
        const text: InteroperableAddressText = {
            version: 1,
            chainType: "eip155",
        };

        const interopAddress = toAddress(text);

        expect(interopAddress.version).toBe(1);
        expect(interopAddress.chainType).toEqual(fromHex("0x0000", "bytes"));
        expect(interopAddress.chainReference).toEqual(new Uint8Array());
        expect(interopAddress.address).toEqual(new Uint8Array());
    });

    it("converts L2 InteroperableAddressText to InteroperableAddress", () => {
        const text: InteroperableAddressText = {
            version: 1,
            chainType: "eip155",
            chainReference: "8453", // Base
            address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
        };

        const interopAddress = toAddress(text);

        expect(interopAddress.version).toBe(1);
        expect(interopAddress.chainType).toEqual(fromHex("0x0000", "bytes"));
        expect(interopAddress.chainReference).toEqual(fromHex("0x2105", "bytes"));
        expect(interopAddress.address).toEqual(
            fromHex("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "bytes"),
        );
    });

    it("handles chain reference as hex string", () => {
        const text: InteroperableAddressText = {
            version: 1,
            chainType: "eip155",
            chainReference: "0x1",
            address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
        };

        const interopAddress = toAddress(text);

        expect(interopAddress.chainReference).toEqual(fromHex("0x01", "bytes"));
    });

    it("throws InvalidChainNamespace for invalid chain type", () => {
        const text = {
            version: 1,
            chainType: "invalid" as "eip155",
            chainReference: "1",
            address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
        };

        expect(() => toAddress(text)).toThrow(InvalidChainNamespace);
    });

    it("round-trips with toText", () => {
        const originalText: InteroperableAddressText = {
            version: 1,
            chainType: "eip155",
            chainReference: "1",
            address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
        };

        const interopAddress = toAddress(originalText);
        const roundTripText = toAddressText(interopAddress);

        expect(roundTripText).toEqual(originalText);
    });
});
