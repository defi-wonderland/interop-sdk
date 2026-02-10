import { arbitrumSepolia, baseSepolia, sepolia } from "viem/chains";
import { describe, expect, it } from "vitest";

import { getChainById, toCaip2ChainId } from "../../src/utils/chainHelpers.js";

describe("chainHelpers", () => {
    describe("getChainById", () => {
        it("should return Sepolia chain for chain ID 11155111", () => {
            const chain = getChainById(sepolia.id);

            expect(chain).toEqual(sepolia);
            expect(chain.id).toBe(11155111);
            expect(chain.name).toBe("Sepolia");
        });

        it("should return Base Sepolia chain for chain ID 84532", () => {
            const chain = getChainById(baseSepolia.id);

            expect(chain).toEqual(baseSepolia);
            expect(chain.id).toBe(84532);
        });

        it("should return Arbitrum Sepolia chain for chain ID 421614", () => {
            const chain = getChainById(arbitrumSepolia.id);

            expect(chain).toEqual(arbitrumSepolia);
            expect(chain.id).toBe(421614);
        });

        it("should throw error for unsupported chain ID", () => {
            const unsupportedChainId = 999999;

            expect(() => getChainById(unsupportedChainId)).toThrow(
                `Unsupported chain ID: ${unsupportedChainId}`,
            );
        });

        it("should throw error for zero chain ID", () => {
            expect(() => getChainById(0)).toThrow("Unsupported chain ID: 0");
        });

        it("should throw error for negative chain ID", () => {
            expect(() => getChainById(-1)).toThrow("Unsupported chain ID: -1");
        });
    });

    describe("toCaip2ChainId", () => {
        it("should convert Ethereum mainnet chain ID to CAIP-2 format", () => {
            expect(toCaip2ChainId(1)).toBe("eip155:1");
        });

        it("should convert Arbitrum chain ID to CAIP-2 format", () => {
            expect(toCaip2ChainId(42161)).toBe("eip155:42161");
        });

        it("should convert Sepolia chain ID to CAIP-2 format", () => {
            expect(toCaip2ChainId(11155111)).toBe("eip155:11155111");
        });

        it("should use custom chain type when provided", () => {
            expect(toCaip2ChainId(1, "solana")).toBe("solana:1");
        });

        it("should use eip155 as default chain type", () => {
            expect(toCaip2ChainId(137)).toBe("eip155:137");
        });
    });
});
