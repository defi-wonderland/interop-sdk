import { fromHex } from "viem";
import { describe, expect, it } from "vitest";

import type { InteroperableAddress } from "../../src/types/interopAddress.js";
import { calculateChecksum } from "../../src/binary/index.js";

describe("calculateChecksum", () => {
    it("calculates checksum for EVM mainnet address", () => {
        const interopAddress: InteroperableAddress = {
            version: 1,
            chainType: fromHex("0x0000", "bytes"),
            chainReference: fromHex("0x01", "bytes"),
            address: fromHex("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "bytes"),
        };

        const checksum = calculateChecksum(interopAddress);

        expect(checksum).toBe("4CA88C9C");
        expect(checksum).toHaveLength(8);
        expect(checksum).toMatch(/^[0-9A-F]+$/);
    });

    it("calculates checksum for Solana address", () => {
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

        const checksum = calculateChecksum(interopAddress);

        expect(checksum).toBe("88835C11");
        expect(checksum).toHaveLength(8);
        expect(checksum).toMatch(/^[0-9A-F]+$/);
    });

    it("calculates checksum for L2 address", () => {
        const interopAddress: InteroperableAddress = {
            version: 1,
            chainType: fromHex("0x0000", "bytes"),
            chainReference: fromHex("0x2105", "bytes"), // Base (8453)
            address: fromHex("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "bytes"),
        };

        const checksum = calculateChecksum(interopAddress);

        expect(checksum).toBe("17DE0709");
        expect(checksum).toHaveLength(8);
        expect(checksum).toMatch(/^[0-9A-F]+$/);
    });

    it("calculates checksum for address without chain reference", () => {
        const interopAddress: InteroperableAddress = {
            version: 1,
            chainType: fromHex("0x0000", "bytes"),
            chainReference: new Uint8Array(),
            address: fromHex("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "bytes"),
        };

        const checksum = calculateChecksum(interopAddress);

        expect(checksum).toHaveLength(8);
        expect(checksum).toMatch(/^[0-9A-F]+$/);
    });

    it("calculates checksum for address without address field", () => {
        const interopAddress: InteroperableAddress = {
            version: 1,
            chainType: fromHex("0x0000", "bytes"),
            chainReference: fromHex("0x01", "bytes"),
            address: new Uint8Array(),
        };

        const checksum = calculateChecksum(interopAddress);

        expect(checksum).toBe("F54D4FBF");
        expect(checksum).toHaveLength(8);
        expect(checksum).toMatch(/^[0-9A-F]+$/);
    });

    it("calculates consistent checksum for same address", () => {
        const interopAddress: InteroperableAddress = {
            version: 1,
            chainType: fromHex("0x0000", "bytes"),
            chainReference: fromHex("0x01", "bytes"),
            address: fromHex("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "bytes"),
        };

        const checksum1 = calculateChecksum(interopAddress);
        const checksum2 = calculateChecksum(interopAddress);

        expect(checksum1).toBe(checksum2);
    });
});
