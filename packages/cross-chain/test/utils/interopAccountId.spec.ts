import { encodeAddress } from "@wonderland/interop-addresses";
import { describe, expect, it } from "vitest";

import { fromInteropAccountId, toInteropAccountId } from "../../src/utils/interopAccountId.js";

// Known addresses for deterministic tests
const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const USER_ADDRESS = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb8";

// Pre-compute expected ERC-7930 hex values
function expectedHex(chainId: number, address: string): string {
    return encodeAddress(
        {
            version: 1,
            chainType: "eip155",
            chainReference: chainId.toString(),
            address,
        },
        { format: "hex" },
    ) as string;
}

describe("interopAccountId", () => {
    describe("toInteropAccountId", () => {
        it("decodes an ERC-7930 hex to InteropAccountId", () => {
            const hex = expectedHex(1, USDC_ADDRESS);
            const result = toInteropAccountId(hex);

            expect(result.chainId).toBe(1);
            expect(result.address.toLowerCase()).toBe(USDC_ADDRESS.toLowerCase());
        });

        it("handles multi-byte chain IDs", () => {
            const hex = expectedHex(11155111, USER_ADDRESS);
            const result = toInteropAccountId(hex);

            expect(result.chainId).toBe(11155111);
            expect(result.address.toLowerCase()).toBe(USER_ADDRESS.toLowerCase());
        });

        it("handles Base chain ID (8453)", () => {
            const hex = expectedHex(8453, USDC_ADDRESS);
            const result = toInteropAccountId(hex);

            expect(result.chainId).toBe(8453);
        });

        it("throws for invalid hex input", () => {
            expect(() => toInteropAccountId("not-valid")).toThrow();
        });
    });

    describe("fromInteropAccountId", () => {
        it("encodes an InteropAccountId to ERC-7930 hex", () => {
            const result = fromInteropAccountId({
                chainId: 1,
                address: USDC_ADDRESS,
            });

            const expected = expectedHex(1, USDC_ADDRESS);
            expect(result).toBe(expected);
        });

        it("encodes Sepolia chain ID correctly", () => {
            const result = fromInteropAccountId({
                chainId: 11155111,
                address: USER_ADDRESS,
            });

            const expected = expectedHex(11155111, USER_ADDRESS);
            expect(result).toBe(expected);
        });

        it("throws for non-positive chainId", () => {
            expect(() => fromInteropAccountId({ chainId: 0, address: USDC_ADDRESS })).toThrow(
                "must be a positive safe integer",
            );
        });

        it("throws for non-integer chainId", () => {
            expect(() => fromInteropAccountId({ chainId: 1.5, address: USDC_ADDRESS })).toThrow(
                "must be a positive safe integer",
            );
        });

        it("returns a valid ERC-7930 hex value", () => {
            const result = fromInteropAccountId({
                chainId: 1,
                address: USDC_ADDRESS,
            });

            // Should be a hex string starting with 0x0001
            expect(result).toMatch(/^0x0001/);
        });
    });

    describe("round-trip", () => {
        it("toInteropAccountId(fromInteropAccountId(id)) preserves values", () => {
            const original = { chainId: 42161, address: USDC_ADDRESS };
            const hex = fromInteropAccountId(original);
            const roundTripped = toInteropAccountId(hex);

            expect(roundTripped.chainId).toBe(original.chainId);
            expect(roundTripped.address.toLowerCase()).toBe(original.address.toLowerCase());
        });

        it("fromInteropAccountId(toInteropAccountId(hex)) preserves hex", () => {
            const originalHex = expectedHex(8453, USER_ADDRESS);
            const id = toInteropAccountId(originalHex);
            const roundTrippedHex = fromInteropAccountId(id);

            expect(roundTrippedHex).toBe(originalHex);
        });
    });
});
