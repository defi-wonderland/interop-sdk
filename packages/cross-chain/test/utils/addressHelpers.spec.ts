import { Hex } from "viem";
import { describe, expect, it } from "vitest";

import { bytes32ToAddress } from "../../src/utils/addressHelpers.js";

describe("addressHelpers", () => {
    describe("bytes32ToAddress", () => {
        it("should extract address from right-aligned bytes32", () => {
            // USDC address padded to 32 bytes
            const bytes32 =
                "0x000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" as Hex;

            const address = bytes32ToAddress(bytes32);

            expect(address).toBe("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
        });

        it("should handle address with all leading zeros", () => {
            const bytes32 =
                "0x0000000000000000000000001234567890123456789012345678901234567890" as Hex;

            const address = bytes32ToAddress(bytes32);

            expect(address).toBe("0x1234567890123456789012345678901234567890");
        });

        it("should handle address that starts with zeros", () => {
            // Address: 0x000000000000000000000001234567890abcdef0
            const bytes32 =
                "0x000000000000000000000000000000000000000000000001234567890abcdef0" as Hex;

            const address = bytes32ToAddress(bytes32);

            expect(address).toBe("0x000000000000000000000001234567890abcdef0");
        });

        it("should handle all-zero address", () => {
            const bytes32 =
                "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex;

            const address = bytes32ToAddress(bytes32);

            expect(address).toBe("0x0000000000000000000000000000000000000000");
        });

        it("should handle all-F address", () => {
            const bytes32 =
                "0x000000000000000000000000ffffffffffffffffffffffffffffffffffffffff" as Hex;

            const address = bytes32ToAddress(bytes32);

            expect(address).toBe("0xffffffffffffffffffffffffffffffffffffffff");
        });

        it("should work with bytes32 without 0x prefix in result", () => {
            const bytes32 =
                "0x000000000000000000000000deadbeefdeadbeefdeadbeefdeadbeefdeadbeef" as Hex;

            const address = bytes32ToAddress(bytes32);

            expect(address).toBe("0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef");
            expect((address as string).startsWith("0x")).toBe(true);
        });

        it("should maintain correct address checksum format", () => {
            // Note: This function doesn't compute checksums, just extracts
            const bytes32 =
                "0x0000000000000000000000005aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed" as Hex;

            const address = bytes32ToAddress(bytes32);

            expect(address).toBe("0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed");
        });

        it("should handle mixed case bytes32", () => {
            const bytes32 =
                "0x000000000000000000000000AbCdEf1234567890aBcDeF1234567890AbCdEf12" as Hex;

            const address = bytes32ToAddress(bytes32);

            expect(address.toLowerCase()).toBe("0xabcdef1234567890abcdef1234567890abcdef12");
        });

        it("should always return exactly 42 characters (0x + 40 hex)", () => {
            const testCases = [
                "0x0000000000000000000000001111111111111111111111111111111111111111",
                "0x000000000000000000000000ffffffffffffffffffffffffffffffffffffffff",
                "0x0000000000000000000000000000000000000000000000000000000000000000",
            ] as Hex[];

            testCases.forEach((bytes32) => {
                const address = bytes32ToAddress(bytes32);
                expect(address.length).toBe(42); // 0x + 40 hex chars
            });
        });
    });
});
