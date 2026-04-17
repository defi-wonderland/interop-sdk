import { describe, expect, it } from "vitest";

import {
    isNativeAddress,
    NATIVE_ASSET_ADDRESS,
    toCanonicalNativeAddress,
} from "../../src/core/utils/token.js";

const NATIVE_ZERO = "0x0000000000000000000000000000000000000000";
const NATIVE_EEE_UPPER = "0xEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE";
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const SOLANA_SYSTEM = "11111111111111111111111111111111";
const SOLANA_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

describe("isNativeAddress", () => {
    it("recognizes 0x000… as native on eip155", () => {
        expect(isNativeAddress(NATIVE_ZERO, "eip155")).toBe(true);
    });

    it("recognizes 0xEEE… as native on eip155 (case-insensitive)", () => {
        expect(isNativeAddress(NATIVE_EEE_UPPER, "eip155")).toBe(true);
        expect(isNativeAddress(NATIVE_EEE_UPPER.toLowerCase(), "eip155")).toBe(true);
    });

    it("returns false for ERC-20 addresses", () => {
        expect(isNativeAddress(USDC, "eip155")).toBe(false);
    });

    it("recognizes Solana system program", () => {
        expect(isNativeAddress(SOLANA_SYSTEM, "solana")).toBe(true);
        expect(isNativeAddress(SOLANA_MINT, "solana")).toBe(false);
    });
});

describe("toCanonicalNativeAddress", () => {
    it("collapses 0x000… to NATIVE_ASSET_ADDRESS on eip155", () => {
        expect(toCanonicalNativeAddress(NATIVE_ZERO, "eip155")).toBe(NATIVE_ASSET_ADDRESS);
    });

    it("leaves NATIVE_ASSET_ADDRESS unchanged (idempotent)", () => {
        expect(toCanonicalNativeAddress(NATIVE_ASSET_ADDRESS, "eip155")).toBe(NATIVE_ASSET_ADDRESS);
        expect(toCanonicalNativeAddress(NATIVE_EEE_UPPER, "eip155")).toBe(NATIVE_ASSET_ADDRESS);
    });

    it("lowercases ERC-20 addresses without rewriting them", () => {
        expect(toCanonicalNativeAddress(USDC, "eip155")).toBe(USDC.toLowerCase());
    });

    it("maps the Solana system program to its canonical form", () => {
        expect(toCanonicalNativeAddress(SOLANA_SYSTEM, "solana")).toBe(SOLANA_SYSTEM);
    });

    it("preserves the casing of non-native Solana addresses (base58 is case-sensitive)", () => {
        expect(toCanonicalNativeAddress(SOLANA_MINT, "solana")).toBe(SOLANA_MINT);
    });
});
