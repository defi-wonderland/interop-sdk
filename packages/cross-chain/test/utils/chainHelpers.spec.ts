import { arbitrumSepolia, baseSepolia, mainnet, sepolia } from "viem/chains";
import { describe, expect, it } from "vitest";

import { getChainById } from "../../src/core/utils/chainHelpers.js";

const UNKNOWN_CHAIN_ID = 123_456_789;

describe("chainHelpers", () => {
    describe("getChainById", () => {
        it("resolves Ethereum mainnet", () => {
            const chain = getChainById(mainnet.id);

            expect(chain).toEqual(mainnet);
            expect(chain.id).toBe(1);
        });

        it("resolves Sepolia", () => {
            const chain = getChainById(sepolia.id);

            expect(chain).toEqual(sepolia);
        });

        it("resolves Base Sepolia", () => {
            const chain = getChainById(baseSepolia.id);

            expect(chain).toEqual(baseSepolia);
        });

        it("resolves Arbitrum Sepolia", () => {
            const chain = getChainById(arbitrumSepolia.id);

            expect(chain).toEqual(arbitrumSepolia);
        });

        it("throws for a chain ID viem does not know", () => {
            expect(() => getChainById(UNKNOWN_CHAIN_ID)).toThrow(
                `Unsupported chain ID: ${UNKNOWN_CHAIN_ID}`,
            );
        });

        it("throws for zero", () => {
            expect(() => getChainById(0)).toThrow("Unsupported chain ID: 0");
        });

        it("throws for negative IDs", () => {
            expect(() => getChainById(-1)).toThrow("Unsupported chain ID: -1");
        });
    });
});
