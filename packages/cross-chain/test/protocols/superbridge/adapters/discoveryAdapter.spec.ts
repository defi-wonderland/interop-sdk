import { describe, expect, it } from "vitest";

import { parseSuperbridgeTokens } from "../../../../src/protocols/superbridge/adapters/discoveryAdapter.js";

describe("parseSuperbridgeTokens", () => {
    it("groups tokens by chain id", () => {
        const networks = parseSuperbridgeTokens({
            tokens: [
                {
                    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                    chainId: "1",
                    symbol: "USDC",
                    decimals: 6,
                },
                {
                    address: "0x0000000000000000000000000000000000000000",
                    chainId: "8453",
                    symbol: "ETH",
                    decimals: 18,
                },
            ],
        });

        expect(networks).toHaveLength(2);
        const ethereum = networks.find((n) => n.chainId === 1);
        expect(ethereum?.assets[0]!.symbol).toBe("USDC");
    });
});
