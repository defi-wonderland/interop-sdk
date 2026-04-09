import type { Address } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Quote } from "../../src/core/schemas/quote.js";
import type { BuildQuoteRequest } from "../../src/core/schemas/quoteRequest.js";
import { Aggregator, createAggregator } from "../../src/external.js";
import {
    AssetDiscoveryFailure,
    CrossChainProvider,
    InsufficientFee,
    InvalidDeadline,
    ProviderNotFound,
    UnsupportedAsset,
    ZeroAmount,
} from "../../src/internal.js";

const USDC_ETH = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as Address;
const USDC_OPT = "0x7F5c764cBc14f9669B88837ca1490cCa17c31607" as Address;

const MOCK_QUOTE: Quote = {
    order: {
        steps: [
            {
                kind: "transaction" as const,
                chainId: 1,
                transaction: {
                    to: "0x5c7BCd6E7De5423a257D81B442095A1a6ced35C5",
                    data: "0xabcdef",
                },
            },
        ],
    },
    preview: {
        inputs: [
            {
                chainId: 1,
                accountAddress: "0x1234567890abcdef1234567890abcdef12345678",
                assetAddress: USDC_ETH,
                amount: "1000000",
            },
        ],
        outputs: [
            {
                chainId: 10,
                accountAddress: "0x1234567890abcdef1234567890abcdef12345678",
                assetAddress: USDC_OPT,
                amount: "990000",
            },
        ],
    },
    provider: "test-provider",
};

const FULL_DISCOVERY_CONFIG = {
    type: "static" as const,
    config: {
        networks: [
            { chainId: 1, assets: [{ address: USDC_ETH, symbol: "USDC", decimals: 6 }] },
            { chainId: 10, assets: [{ address: USDC_OPT, symbol: "USDC", decimals: 6 }] },
        ],
    },
};

function createMockProvider(
    providerId: string,
    discoveryConfig: ReturnType<CrossChainProvider["getDiscoveryConfig"]> = null,
    buildQuoteResult: Quote = MOCK_QUOTE,
): CrossChainProvider {
    return {
        protocolName: providerId,
        providerId,
        getProviderId: vi.fn(() => providerId),
        getProtocolName: vi.fn(() => providerId),
        getQuotes: vi.fn(() => Promise.resolve([])),
        buildQuote: vi.fn(() => Promise.resolve(buildQuoteResult)),
        submitOrder: vi.fn(),
        submitSignedOrder: vi.fn(),
        getTrackingConfig: vi.fn(),
        getDiscoveryConfig: vi.fn(() => discoveryConfig),
    } as unknown as CrossChainProvider;
}

function buildParams(overrides?: Partial<BuildQuoteRequest>): BuildQuoteRequest {
    return {
        user: "0x1234567890abcdef1234567890abcdef12345678",
        input: { chainId: 1, assetAddress: USDC_ETH, amount: "1000000" },
        output: { chainId: 10, assetAddress: USDC_OPT, amount: "990000" },
        escrowContractAddress: "0x5c7BCd6E7De5423a257D81B442095A1a6ced35C5",
        fillDeadline: Math.floor(Date.now() / 1000) + 3600,
        ...overrides,
    };
}

describe("Aggregator - buildQuote", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns quote with _providerId appended", async () => {
        const provider = createMockProvider("across", FULL_DISCOVERY_CONFIG);
        const aggregator = createAggregator({ providers: [provider] });
        const params = buildParams();

        const result = await aggregator.buildQuote("across", params);

        expect(result._providerId).toBe("across");
        expect(result.order).toEqual(MOCK_QUOTE.order);
        expect(result.preview).toEqual(MOCK_QUOTE.preview);
        expect(provider.buildQuote).toHaveBeenCalledWith(params);
    });

    it("throws ProviderNotFound for unknown provider", async () => {
        const provider = createMockProvider("across", FULL_DISCOVERY_CONFIG);
        const aggregator = createAggregator({ providers: [provider] });

        await expect(aggregator.buildQuote("unknown", buildParams())).rejects.toThrow(
            ProviderNotFound,
        );
    });

    it("throws UnsupportedAsset when provider lacks the requested route", async () => {
        const across = createMockProvider("across", {
            type: "static",
            config: {
                networks: [
                    { chainId: 10, assets: [{ address: USDC_OPT, symbol: "USDC", decimals: 6 }] },
                ],
            },
        });
        const helper = createMockProvider("helper", FULL_DISCOVERY_CONFIG);
        const aggregator = createAggregator({ providers: [across, helper] });

        await expect(aggregator.buildQuote("across", buildParams())).rejects.toThrow(
            UnsupportedAsset,
        );
        expect(across.buildQuote).not.toHaveBeenCalled();
    });

    it("builds quote without discoveryFactory using allowDangerousParameters", async () => {
        const provider = createMockProvider("across");
        const aggregator = new Aggregator({ providers: [provider] });
        const params = buildParams({ allowDangerousParameters: true });

        const result = await aggregator.buildQuote("across", params);

        expect(result._providerId).toBe("across");
        expect(provider.buildQuote).toHaveBeenCalledWith(params);
    });

    it("falls back gracefully when discovery throws AssetDiscoveryFailure", async () => {
        const provider = createMockProvider("across", FULL_DISCOVERY_CONFIG);
        const aggregator = createAggregator({ providers: [provider] });

        const cache = (
            aggregator as unknown as {
                discoveryCache: Map<
                    string,
                    { isAssetSupported: (...args: unknown[]) => Promise<unknown> }
                >;
            }
        ).discoveryCache;
        const service = cache.get("across")!;
        vi.spyOn(service, "isAssetSupported").mockRejectedValue(
            new AssetDiscoveryFailure("boom", "discovery failed"),
        );

        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const params = buildParams();

        const result = await aggregator.buildQuote("across", params);

        expect(result._providerId).toBe("across");
        expect(provider.buildQuote).toHaveBeenCalledWith(params);
        expect(warnSpy).toHaveBeenCalled();

        warnSpy.mockRestore();
    });

    it("propagates ZeroAmount from validation", async () => {
        const provider = createMockProvider("across", FULL_DISCOVERY_CONFIG);
        const aggregator = createAggregator({ providers: [provider] });
        const params = buildParams({
            input: { chainId: 1, assetAddress: USDC_ETH, amount: "0" },
        });

        await expect(aggregator.buildQuote("across", params)).rejects.toThrow(ZeroAmount);
        expect(provider.buildQuote).not.toHaveBeenCalled();
    });

    it("propagates InvalidDeadline for past deadline", async () => {
        const provider = createMockProvider("across", FULL_DISCOVERY_CONFIG);
        const aggregator = createAggregator({ providers: [provider] });
        const params = buildParams({ fillDeadline: Math.floor(Date.now() / 1000) - 100 });

        await expect(aggregator.buildQuote("across", params)).rejects.toThrow(InvalidDeadline);
        expect(provider.buildQuote).not.toHaveBeenCalled();
    });

    it("propagates InsufficientFee when output >= input on same asset", async () => {
        const provider = createMockProvider("across", FULL_DISCOVERY_CONFIG);
        const aggregator = createAggregator({ providers: [provider] });
        const params = buildParams({
            input: { chainId: 1, assetAddress: USDC_ETH, amount: "1000000" },
            output: { chainId: 10, assetAddress: USDC_OPT, amount: "1000000" },
        });

        await expect(aggregator.buildQuote("across", params)).rejects.toThrow(InsufficientFee);
        expect(provider.buildQuote).not.toHaveBeenCalled();
    });

    it("allowDangerousParameters bypasses all validation", async () => {
        const provider = createMockProvider("across", {
            type: "static",
            config: { networks: [] },
        });
        const aggregator = createAggregator({ providers: [provider] });
        const params = buildParams({
            input: { chainId: 1, assetAddress: USDC_ETH, amount: "0" },
            output: { chainId: 1, assetAddress: USDC_ETH, amount: "0" },
            fillDeadline: Math.floor(Date.now() / 1000) - 100,
            allowDangerousParameters: true,
        });

        const result = await aggregator.buildQuote("across", params);

        expect(result._providerId).toBe("across");
        expect(provider.buildQuote).toHaveBeenCalledWith(params);
    });
});
