import { describe, expect, it } from "vitest";

import { parseBungeeTokenListResponse } from "../../../../src/protocols/bungee/adapters/discoveryAdapter.js";

function buildTokenEntry(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        chainId: 1,
        address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        name: "USD Coin",
        symbol: "USDC",
        decimals: 6,
        ...overrides,
    };
}

function buildTokenListResponse(tokens: Record<string, unknown[]> = {}): Record<string, unknown> {
    return {
        success: true,
        statusCode: 200,
        result: tokens,
    };
}

describe("parseBungeeTokenListResponse", () => {
    it("parses valid response and returns tokens per chain", () => {
        const response = buildTokenListResponse({
            "1": [buildTokenEntry()],
            "10": [buildTokenEntry({ chainId: 10, symbol: "USDT", address: "0x1234" })],
        });

        const result = parseBungeeTokenListResponse(response);

        expect(result).toHaveLength(2);
        expect(result[0]!.chainId).toBe(1);
        expect(result[0]!.assets).toHaveLength(1);
        expect(result[0]!.assets[0]!.symbol).toBe("USDC");
        expect(result[0]!.assets[0]!.decimals).toBe(6);
    });

    it("extracts only address, symbol, decimals from tokens", () => {
        const response = buildTokenListResponse({
            "1": [buildTokenEntry({ logoURI: "https://example.com/logo.png", isVerified: true })],
        });

        const result = parseBungeeTokenListResponse(response);
        const asset = result[0]!.assets[0]!;

        expect(asset).toEqual({
            address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
            symbol: "USDC",
            decimals: 6,
        });
    });

    it("filters out chains with empty token arrays", () => {
        const response = buildTokenListResponse({
            "1": [buildTokenEntry()],
            "42161": [],
        });

        const result = parseBungeeTokenListResponse(response);

        expect(result).toHaveLength(1);
        expect(result[0]!.chainId).toBe(1);
    });

    it("returns empty array when no chains have tokens", () => {
        const response = buildTokenListResponse({});

        const result = parseBungeeTokenListResponse(response);

        expect(result).toHaveLength(0);
    });

    it("handles multiple tokens per chain", () => {
        const response = buildTokenListResponse({
            "1": [
                buildTokenEntry({ symbol: "USDC" }),
                buildTokenEntry({ symbol: "WETH", address: "0xC02a", decimals: 18 }),
            ],
        });

        const result = parseBungeeTokenListResponse(response);

        expect(result[0]!.assets).toHaveLength(2);
        expect(result[0]!.assets[0]!.symbol).toBe("USDC");
        expect(result[0]!.assets[1]!.symbol).toBe("WETH");
    });
});
