import { describe, expect, it } from "vitest";

import { fromChainIdentifier, toChainIdentifier } from "../../src/address/chainIdentifier.js";
import { ChainTypeName, InvalidChainIdentifier } from "../../src/internal.js";

describe("toChainIdentifier", () => {
    it("should convert Ethereum mainnet chain ID to CAIP-350 format", () => {
        expect(toChainIdentifier(1)).toBe("eip155:1");
    });

    it("should convert Sepolia chain ID to CAIP-350 format", () => {
        expect(toChainIdentifier(11155111)).toBe("eip155:11155111");
    });

    it("should use custom chain type when provided", () => {
        expect(toChainIdentifier(1, ChainTypeName.SOLANA)).toBe("solana:1");
    });

    it("should use eip155 as default chain type", () => {
        expect(toChainIdentifier(137)).toBe(toChainIdentifier(137, ChainTypeName.EIP155));
    });
});

describe("fromChainIdentifier", () => {
    it("should parse eip155 Ethereum mainnet identifier", () => {
        expect(fromChainIdentifier("eip155:1")).toEqual({
            chainReference: 1,
            chainType: ChainTypeName.EIP155,
        });
    });

    it("should parse eip155 Arbitrum identifier", () => {
        expect(fromChainIdentifier("eip155:42161")).toEqual({
            chainReference: 42161,
            chainType: ChainTypeName.EIP155,
        });
    });

    it("should parse Sepolia identifier", () => {
        expect(fromChainIdentifier("eip155:11155111")).toEqual({
            chainReference: 11155111,
            chainType: ChainTypeName.EIP155,
        });
    });

    it("should parse solana identifier", () => {
        expect(fromChainIdentifier("solana:101")).toEqual({
            chainReference: 101,
            chainType: ChainTypeName.SOLANA,
        });
    });

    it("should be the inverse of toChainIdentifier", () => {
        for (const chainId of [1, 137, 42161, 11155111]) {
            const { chainReference, chainType } = fromChainIdentifier(toChainIdentifier(chainId));
            expect(chainReference).toBe(chainId);
            expect(chainType).toBe(ChainTypeName.EIP155);
        }
    });

    it("should round-trip with toChainIdentifier for solana", () => {
        const { chainReference, chainType } = fromChainIdentifier(
            toChainIdentifier(101, ChainTypeName.SOLANA),
        );
        expect(chainReference).toBe(101);
        expect(chainType).toBe(ChainTypeName.SOLANA);
    });

    it("should throw InvalidChainIdentifier for unknown namespace", () => {
        expect(() => fromChainIdentifier("cosmos:1")).toThrow(InvalidChainIdentifier);
    });

    it("should throw InvalidChainIdentifier for missing separator", () => {
        expect(() => fromChainIdentifier("eip155")).toThrow(InvalidChainIdentifier);
    });

    it("should throw InvalidChainIdentifier for empty namespace", () => {
        expect(() => fromChainIdentifier(":1")).toThrow(InvalidChainIdentifier);
    });

    it("should throw InvalidChainIdentifier for empty reference", () => {
        expect(() => fromChainIdentifier("eip155:")).toThrow(InvalidChainIdentifier);
    });

    it("should throw InvalidChainIdentifier for non-numeric reference", () => {
        expect(() => fromChainIdentifier("eip155:abc")).toThrow(InvalidChainIdentifier);
    });

    it("should throw InvalidChainIdentifier for negative reference", () => {
        expect(() => fromChainIdentifier("eip155:-1")).toThrow(InvalidChainIdentifier);
    });

    it("should throw InvalidChainIdentifier for floating-point reference", () => {
        expect(() => fromChainIdentifier("eip155:1.5")).toThrow(InvalidChainIdentifier);
    });
});
