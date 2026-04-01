import type { Address } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Quote } from "../../src/core/schemas/quote.js";
import type { BuildQuoteRequest } from "../../src/core/schemas/quoteRequest.js";
import { createAggregator } from "../../src/external.js";
import {
    CrossChainProvider,
    InsufficientFee,
    InvalidDeadline,
    ProviderExecuteNotImplemented,
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
    discoveryConfig: ReturnType<CrossChainProvider["getDiscoveryConfig"]> = FULL_DISCOVERY_CONFIG,
): CrossChainProvider {
    return {
        protocolName: providerId,
        providerId,
        getProviderId: vi.fn(() => providerId),
        getProtocolName: vi.fn(() => providerId),
        getQuotes: vi.fn(() => Promise.resolve([])),
        buildQuote: vi.fn(() => Promise.resolve(MOCK_QUOTE)),
        submitOrder: vi.fn(),
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

describe("Aggregator - buildQuotes", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("collects quotes from all supporting providers, skipping not-implemented ones", async () => {
        const across = createMockProvider("across");
        const oif = createMockProvider("oif");
        const relay = createMockProvider("relay");
        (relay.buildQuote as ReturnType<typeof vi.fn>).mockRejectedValue(
            new ProviderExecuteNotImplemented("relay"),
        );
        const aggregator = createAggregator({ providers: [across, oif, relay] });

        const result = await aggregator.buildQuotes(buildParams());

        expect(result.quotes.map((q) => q._providerId)).toEqual(["across", "oif"]);
        expect(result.errors).toHaveLength(0);
    });

    it("skips providers that do not support the requested assets", async () => {
        const partial = createMockProvider("across", {
            type: "static",
            config: {
                networks: [
                    { chainId: 10, assets: [{ address: USDC_OPT, symbol: "USDC", decimals: 6 }] },
                ],
            },
        });
        const full = createMockProvider("oif");
        const aggregator = createAggregator({ providers: [partial, full] });

        const result = await aggregator.buildQuotes(buildParams());

        expect(result.quotes).toHaveLength(1);
        expect(result.quotes[0]._providerId).toBe("oif");
        expect(partial.buildQuote).not.toHaveBeenCalled();
    });

    it("captures provider errors in errors array", async () => {
        const failing = createMockProvider("across");
        (failing.buildQuote as ReturnType<typeof vi.fn>).mockRejectedValue(
            new Error("provider failure"),
        );
        const working = createMockProvider("oif");
        const aggregator = createAggregator({ providers: [failing, working] });

        const result = await aggregator.buildQuotes(buildParams());

        expect(result.quotes).toHaveLength(1);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].errorMsg).toContain("provider failure");
    });

    it.each([
        {
            label: "ZeroAmount",
            overrides: { input: { chainId: 1, assetAddress: USDC_ETH, amount: "0" } },
            expectedError: ZeroAmount,
        },
        {
            label: "InvalidDeadline",
            overrides: { fillDeadline: Math.floor(Date.now() / 1000) - 100 },
            expectedError: InvalidDeadline,
        },
        {
            label: "InsufficientFee",
            overrides: {
                input: { chainId: 1, assetAddress: USDC_ETH, amount: "1000000" },
                output: { chainId: 10, assetAddress: USDC_OPT, amount: "1000000" },
            },
            expectedError: InsufficientFee,
        },
    ])("throws $label before calling any provider", async ({ overrides, expectedError }) => {
        const provider = createMockProvider("across");
        const aggregator = createAggregator({ providers: [provider] });

        await expect(aggregator.buildQuotes(buildParams(overrides))).rejects.toThrow(expectedError);
        expect(provider.buildQuote).not.toHaveBeenCalled();
    });

    it("allowDangerousParameters bypasses validation and asset support checks", async () => {
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

        const result = await aggregator.buildQuotes(params);

        expect(result.quotes).toHaveLength(1);
        expect(provider.buildQuote).toHaveBeenCalledWith(params);
    });
});
