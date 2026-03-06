import { describe, expect, it, vi } from "vitest";

import type { CustomApiAssetDiscoveryConfig, NetworkAssets } from "../../../src/internal.js";
import {
    AssetDiscoveryFactory,
    CustomApiAssetDiscoveryService,
    RelayCurrenciesResponseSchema,
    RelayProvider,
} from "../../../src/internal.js";

// ── Constants ────────────────────────────────────────────

const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const USDC_POLYGON_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const ETHEREUM_CHAIN_ID = 1;
const POLYGON_CHAIN_ID = 137;
const USDC_DECIMALS = 6;
const WETH_DECIMALS = 18;

// ── Helpers ──────────────────────────────────────────────

function getCustomApiConfig(provider: RelayProvider): CustomApiAssetDiscoveryConfig["config"] {
    const config = provider.getDiscoveryConfig();
    if (!config || config.type !== "custom-api") {
        throw new Error(`Expected custom-api config, got ${config?.type ?? "null"}`);
    }
    return config.config;
}

function makeCurrencyEntry(
    chainId: number,
    address: string,
    symbol: string,
    decimals: number,
): Record<string, unknown> {
    return { chainId, address, symbol, name: `${symbol} Token`, decimals };
}

// ── Tests ────────────────────────────────────────────────

describe("RelayProvider.discovery", () => {
    describe("getDiscoveryConfig", () => {
        it("returns custom-api config type", () => {
            const config = new RelayProvider().getDiscoveryConfig();
            expect(config).not.toBeNull();
            expect(config!.type).toBe("custom-api");
        });

        it("uses default base URL for assets endpoint", () => {
            const apiConfig = getCustomApiConfig(new RelayProvider());
            expect(apiConfig.assetsEndpoint).toBe("https://api.relay.link/currencies/v2");
        });

        it("uses custom baseUrl when provided", () => {
            const apiConfig = getCustomApiConfig(
                new RelayProvider({ baseUrl: "https://custom.relay.link" }),
            );
            expect(apiConfig.assetsEndpoint).toBe("https://custom.relay.link/currencies/v2");
        });
    });

    describe("parseCurrenciesResponse", () => {
        const provider = new RelayProvider();
        const { parseResponse } = getCustomApiConfig(provider);

        it("groups currencies by chain", () => {
            const mockCurrencies = [
                makeCurrencyEntry(ETHEREUM_CHAIN_ID, USDC_ADDRESS, "USDC", USDC_DECIMALS),
                makeCurrencyEntry(ETHEREUM_CHAIN_ID, WETH_ADDRESS, "WETH", WETH_DECIMALS),
                makeCurrencyEntry(POLYGON_CHAIN_ID, USDC_POLYGON_ADDRESS, "USDC", USDC_DECIMALS),
            ];

            const result: NetworkAssets[] = parseResponse(mockCurrencies);

            expect(result).toHaveLength(2);
            const ethereum = result.find((n: NetworkAssets) => n.chainId === ETHEREUM_CHAIN_ID);
            expect(ethereum?.assets).toHaveLength(2);
            const polygon = result.find((n: NetworkAssets) => n.chainId === POLYGON_CHAIN_ID);
            expect(polygon?.assets).toHaveLength(1);
        });

        it("encodes addresses to EIP-7930 format", () => {
            const mockCurrencies = [
                makeCurrencyEntry(ETHEREUM_CHAIN_ID, USDC_ADDRESS, "USDC", USDC_DECIMALS),
            ];

            const result: NetworkAssets[] = parseResponse(mockCurrencies);
            const asset = result[0]?.assets[0];

            expect(asset?.address).toMatch(/^0x/);
            expect(asset?.address.length).toBeGreaterThan(42);
        });

        it("handles empty array", () => {
            expect(parseResponse([])).toHaveLength(0);
        });

        it("deduplicates currencies by address on the same chain", () => {
            const mockCurrencies = [
                makeCurrencyEntry(ETHEREUM_CHAIN_ID, USDC_ADDRESS, "USDC", USDC_DECIMALS),
                makeCurrencyEntry(
                    ETHEREUM_CHAIN_ID,
                    USDC_ADDRESS.toLowerCase(),
                    "USDC.e",
                    USDC_DECIMALS,
                ),
            ];

            const result: NetworkAssets[] = parseResponse(mockCurrencies);
            const ethereum = result.find((n: NetworkAssets) => n.chainId === ETHEREUM_CHAIN_ID);

            expect(ethereum?.assets).toHaveLength(1);
            expect(ethereum?.assets[0]?.symbol).toBe("USDC");
        });

        it("preserves symbol and decimals", () => {
            const mockCurrencies = [
                makeCurrencyEntry(ETHEREUM_CHAIN_ID, WETH_ADDRESS, "WETH", WETH_DECIMALS),
            ];

            const result: NetworkAssets[] = parseResponse(mockCurrencies);
            const asset = result[0]?.assets[0];

            expect(asset?.symbol).toBe("WETH");
            expect(asset?.decimals).toBe(WETH_DECIMALS);
        });

        it("throws on invalid schema (missing required fields)", () => {
            expect(() => parseResponse([{ chainId: 1, address: USDC_ADDRESS }])).toThrow();
        });

        it("throws on negative chainId", () => {
            expect(() =>
                parseResponse([makeCurrencyEntry(-1, USDC_ADDRESS, "USDC", USDC_DECIMALS)]),
            ).toThrow();
        });
    });

    describe("Zod schema validation", () => {
        it("validates correct currency format", () => {
            const result = RelayCurrenciesResponseSchema.safeParse([
                makeCurrencyEntry(ETHEREUM_CHAIN_ID, USDC_ADDRESS, "USDC", USDC_DECIMALS),
            ]);
            expect(result.success).toBe(true);
        });

        it("validates currency with metadata and vmType", () => {
            const result = RelayCurrenciesResponseSchema.safeParse([
                {
                    ...makeCurrencyEntry(ETHEREUM_CHAIN_ID, USDC_ADDRESS, "USDC", USDC_DECIMALS),
                    vmType: "evm",
                    metadata: {
                        logoURI: "https://example.com/usdc.png",
                        verified: true,
                        isNative: false,
                    },
                },
            ]);
            expect(result.success).toBe(true);
        });

        it("rejects empty symbol", () => {
            const result = RelayCurrenciesResponseSchema.safeParse([
                makeCurrencyEntry(ETHEREUM_CHAIN_ID, USDC_ADDRESS, "", USDC_DECIMALS),
            ]);
            expect(result.success).toBe(false);
        });

        it("rejects decimals > 255", () => {
            const result = RelayCurrenciesResponseSchema.safeParse([
                makeCurrencyEntry(ETHEREUM_CHAIN_ID, USDC_ADDRESS, "USDC", 256),
            ]);
            expect(result.success).toBe(false);
        });
    });

    describe("Factory integration", () => {
        it("creates CustomApiAssetDiscoveryService from RelayProvider config", () => {
            const service = new AssetDiscoveryFactory().createService(new RelayProvider());
            expect(service).toBeInstanceOf(CustomApiAssetDiscoveryService);
        });

        it("starts prefetching on creation", () => {
            const prefetchSpy = vi.spyOn(CustomApiAssetDiscoveryService.prototype, "prefetch");
            new AssetDiscoveryFactory().createService(new RelayProvider());
            expect(prefetchSpy).toHaveBeenCalledOnce();
            prefetchSpy.mockRestore();
        });
    });
});
