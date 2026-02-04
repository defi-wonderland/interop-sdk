import { arbitrumSepolia, baseSepolia, sepolia } from "viem/chains";
import { describe, expect, it } from "vitest";

import { getChainById, getChainType, isEvmChain } from "../../src/utils/chainHelpers.js";

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

    describe("getChainType", () => {
        it("should return 'eip155' for Ethereum mainnet", () => {
            expect(getChainType(1)).toBe("eip155");
        });

        it("should return 'eip155' for EVM L2s", () => {
            expect(getChainType(10)).toBe("eip155"); // Optimism
            expect(getChainType(42161)).toBe("eip155"); // Arbitrum
            expect(getChainType(8453)).toBe("eip155"); // Base
            expect(getChainType(137)).toBe("eip155"); // Polygon
        });

        it("should return 'eip155' for testnets", () => {
            expect(getChainType(11155111)).toBe("eip155"); // Sepolia
            expect(getChainType(84532)).toBe("eip155"); // Base Sepolia
        });

        it("should return 'solana' for Solana mainnet", () => {
            // Solana CAIP-2 chain ID used by Across
            expect(getChainType(34268394551451)).toBe("solana");
        });

        it("should default to 'eip155' for unknown chain IDs", () => {
            expect(getChainType(999999999)).toBe("eip155");
        });
    });

    describe("isEvmChain", () => {
        it("should return true for EVM chains", () => {
            expect(isEvmChain(1)).toBe(true);
            expect(isEvmChain(10)).toBe(true);
            expect(isEvmChain(42161)).toBe(true);
            expect(isEvmChain(8453)).toBe(true);
        });

        it("should return false for Solana", () => {
            expect(isEvmChain(34268394551451)).toBe(false);
        });

        it("should return true for unknown chains (defaults to EVM)", () => {
            expect(isEvmChain(999999999)).toBe(true);
        });
    });
});
