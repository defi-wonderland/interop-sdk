import { Hex } from "viem";
import { describe, expect, it } from "vitest";

import { parseAbiEncodedField, parseAbiEncodedFields } from "../../src/utils/eventDataParser.js";

describe("eventDataParser", () => {
    describe("parseAbiEncodedField", () => {
        it("should parse the first field (index 0) with default 32-byte size", () => {
            // 0x prefix + 64 hex chars (32 bytes) = "123" in decimal
            const data =
                "0x000000000000000000000000000000000000000000000000000000000000007b" as Hex;

            const result = parseAbiEncodedField(data, 0);

            expect(result).toBe(123n);
        });

        it("should parse the second field (index 1) with default 32-byte size", () => {
            // First field: 123, Second field: 456
            const data =
                "0x000000000000000000000000000000000000000000000000000000000000007b00000000000000000000000000000000000000000000000000000000000001c8" as Hex;

            const result = parseAbiEncodedField(data, 1);

            expect(result).toBe(456n);
        });

        it("should parse the third field (index 2) with default 32-byte size", () => {
            // Three fields: 100, 200, 300
            const data =
                "0x000000000000000000000000000000000000000000000000000000000000006400000000000000000000000000000000000000000000000000000000000000c8000000000000000000000000000000000000000000000000000000000000012c" as Hex;

            const result = parseAbiEncodedField(data, 2);

            expect(result).toBe(300n);
        });

        it("should parse large numbers", () => {
            // 1 ETH in wei (1000000000000000000)
            const data =
                "0x0000000000000000000000000000000000000000000000000de0b6b3a7640000" as Hex;

            const result = parseAbiEncodedField(data, 0);

            expect(result).toBe(1000000000000000000n);
        });

        it("should parse maximum uint256 value", () => {
            // Max uint256: 2^256 - 1
            const data =
                "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff" as Hex;

            const result = parseAbiEncodedField(data, 0);

            expect(result).toBe(
                115792089237316195423570985008687907853269984665640564039457584007913129639935n,
            );
        });

        it("should parse zero values", () => {
            const data =
                "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex;

            const result = parseAbiEncodedField(data, 0);

            expect(result).toBe(0n);
        });

        it("should parse with custom field size (16 bytes)", () => {
            // 16-byte field with value 255
            const data = "0x000000000000000000000000000000ff" as Hex;

            const result = parseAbiEncodedField(data, 0, 16);

            expect(result).toBe(255n);
        });

        it("should parse second field with custom field size (16 bytes)", () => {
            // Two 16-byte fields: 100, 200
            const data = "0x000000000000000000000000000000640000000000000000000000000000c8" as Hex;

            const result = parseAbiEncodedField(data, 1, 16);

            expect(result).toBe(200n);
        });

        it("should parse with custom field size (8 bytes)", () => {
            // 8-byte field with value 42
            const data = "0x000000000000002a" as Hex;

            const result = parseAbiEncodedField(data, 0, 8);

            expect(result).toBe(42n);
        });

        it("should handle addresses encoded as 32-byte fields", () => {
            // Ethereum address padded to 32 bytes
            const address = "0x1234567890123456789012345678901234567890";
            const data =
                "0x0000000000000000000000001234567890123456789012345678901234567890" as Hex;

            const result = parseAbiEncodedField(data, 0);

            expect(result).toBe(BigInt(address));
        });
    });

    describe("parseAbiEncodedFields", () => {
        it("should parse multiple fields with default 32-byte size", () => {
            // Four fields: 100, 200, 300, 400
            const data =
                "0x000000000000000000000000000000000000000000000000000000000000006400000000000000000000000000000000000000000000000000000000000000c8000000000000000000000000000000000000000000000000000000000000012c0000000000000000000000000000000000000000000000000000000000000190" as Hex;

            const result = parseAbiEncodedFields(data, [0, 1, 2, 3]);

            expect(result).toEqual([100n, 200n, 300n, 400n]);
        });

        it("should parse non-consecutive field indices", () => {
            // Four fields: 100, 200, 300, 400
            // Extract only 1st and 3rd (indices 0 and 2)
            const data =
                "0x000000000000000000000000000000000000000000000000000000000000006400000000000000000000000000000000000000000000000000000000000000c8000000000000000000000000000000000000000000000000000000000000012c0000000000000000000000000000000000000000000000000000000000000190" as Hex;

            const result = parseAbiEncodedFields(data, [0, 2]);

            expect(result).toEqual([100n, 300n]);
        });

        it("should parse fields in any order", () => {
            // Four fields: 10, 20, 30, 40
            // Extract in reverse order
            const data =
                "0x000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000001e0000000000000000000000000000000000000000000000000000000000000028" as Hex;

            const result = parseAbiEncodedFields(data, [3, 2, 1, 0]);

            expect(result).toEqual([40n, 30n, 20n, 10n]);
        });

        it("should handle single field extraction", () => {
            const data =
                "0x000000000000000000000000000000000000000000000000000000000000007b" as Hex;

            const result = parseAbiEncodedFields(data, [0]);

            expect(result).toEqual([123n]);
        });

        it("should parse multiple fields with custom field size (16 bytes)", () => {
            // Three 16-byte fields: 111, 222, 333
            const data =
                "0x0000000000000000000000000000006f000000000000000000000000000000de0000000000000000000000000000014d" as Hex;

            const result = parseAbiEncodedFields(data, [0, 1, 2], 16);

            expect(result).toEqual([111n, 222n, 333n]);
        });

        it("should parse multiple fields with custom field size (8 bytes)", () => {
            // Four 8-byte fields: 1, 2, 3, 4
            const data =
                "0x0000000000000001000000000000000200000000000000030000000000000004" as Hex;

            const result = parseAbiEncodedFields(data, [0, 1, 2, 3], 8);

            expect(result).toEqual([1n, 2n, 3n, 4n]);
        });

        it("should handle empty indices array", () => {
            const data =
                "0x000000000000000000000000000000000000000000000000000000000000007b" as Hex;

            const result = parseAbiEncodedFields(data, []);

            expect(result).toEqual([]);
        });

        it("should parse same field multiple times", () => {
            const data =
                "0x000000000000000000000000000000000000000000000000000000000000002a" as Hex;

            const result = parseAbiEncodedFields(data, [0, 0, 0]);

            expect(result).toEqual([42n, 42n, 42n]);
        });

        it("should handle real-world example: Across FundsDeposited amounts", () => {
            // Simulating Across FundsDeposited event data structure:
            // Field 0: inputToken (address padded to 32 bytes)
            // Field 1: outputToken (address padded to 32 bytes)
            // Field 2: inputAmount (uint256) - 1000000 (1 USDC with 6 decimals)
            // Field 3: outputAmount (uint256) - 990000 (0.99 USDC with 6 decimals)
            const data =
                "0x" +
                "000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" + // inputToken (USDC)
                "000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" + // outputToken (USDC)
                "00000000000000000000000000000000000000000000000000000000000f4240" + // inputAmount: 1000000
                "00000000000000000000000000000000000000000000000000000000000f1b30"; // outputAmount: 990000

            const [inputAmount, outputAmount] = parseAbiEncodedFields(data as Hex, [2, 3]);

            expect(inputAmount).toBe(1000000n);
            expect(outputAmount).toBe(990000n);
        });

        it("should handle mixed value sizes", () => {
            // Small value, large value, zero
            const data =
                "0x" +
                "0000000000000000000000000000000000000000000000000000000000000001" + // 1
                "0000000000000000000000000000000000000000000000000de0b6b3a7640000" + // 1 ETH in wei
                "0000000000000000000000000000000000000000000000000000000000000000"; // 0

            const result = parseAbiEncodedFields(data as Hex, [0, 1, 2]);

            expect(result).toEqual([1n, 1000000000000000000n, 0n]);
        });
    });
});
