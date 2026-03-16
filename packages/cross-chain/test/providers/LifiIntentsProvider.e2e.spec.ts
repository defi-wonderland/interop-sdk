/**
 * E2E smoke test against the real LI.FI order server.
 *
 * Run with: npx vitest run test/providers/LifiIntentsProvider.e2e.spec.ts
 *
 * These tests hit the live API and may fail if:
 * - No solvers are online
 * - The route has no liquidity
 * - The API format changes again
 */

import { describe, expect, it } from "vitest";

import {
    createCrossChainProvider,
    LifiIntentsProvider,
    ProviderGetQuoteFailure,
} from "../../src/external.js";

const ORDER_SERVER_URL = "https://order.li.fi";

describe("LifiIntentsProvider E2E", () => {
    const provider = new LifiIntentsProvider({
        orderServerUrl: ORDER_SERVER_URL,
    });

    describe("getQuotes - real API", () => {
        it("returns quotes for USDC Eth→Base (10 USDC)", async () => {
            let quotes;
            try {
                quotes = await provider.getQuotes({
                    user: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
                    input: {
                        chainId: 1,
                        assetAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                        amount: "10000000",
                    },
                    output: {
                        chainId: 8453,
                        assetAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                    },
                });
            } catch (error) {
                if (error instanceof ProviderGetQuoteFailure) {
                    console.error("ProviderGetQuoteFailure:", error.message, error.cause);
                }
                throw error;
            }

            console.log(`Got ${quotes.length} quote(s)`);

            if (quotes.length === 0) {
                console.warn("No quotes returned - solvers may be offline.");
                return;
            }

            const quote = quotes[0]!;
            console.log(
                "Quote:",
                JSON.stringify(
                    {
                        provider: quote.provider,
                        quoteId: quote.quoteId,
                        stepKind: quote.order.steps[0]?.kind,
                        inputAmount: quote.preview.inputs[0]?.amount,
                        outputAmount: quote.preview.outputs[0]?.amount,
                        inputChain: quote.preview.inputs[0]?.chainId,
                        outputChain: quote.preview.outputs[0]?.chainId,
                    },
                    null,
                    2,
                ),
            );

            expect(quote.order.steps.length).toBeGreaterThan(0);
            expect(quote.order.steps[0]!.kind).toBe("transaction");
            expect(quote.provider).toBe("lifi-intents");

            expect(quote.preview.inputs[0]!.chainId).toBe(1);
            expect(quote.preview.inputs[0]!.amount).toBe("10000000");
            expect(quote.preview.outputs[0]!.chainId).toBe(8453);
            expect(Number(quote.preview.outputs[0]!.amount)).toBeGreaterThan(0);

            const txStep = quote.order.steps[0]!;
            if (txStep.kind === "transaction") {
                expect(txStep.transaction.to).toBeDefined();
                expect(txStep.transaction.data).toBeDefined();
                expect(txStep.chainId).toBe(1);
            }
        }, 30_000);

        it("returns quotes for USDC Arb→Base", async () => {
            const quotes = await provider.getQuotes({
                user: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
                input: {
                    chainId: 42161,
                    assetAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
                    amount: "10000000",
                },
                output: {
                    chainId: 8453,
                    assetAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                },
            });

            console.log(`Arb→Base: ${quotes.length} quote(s)`);

            if (quotes.length > 0) {
                expect(quotes[0]!.preview.inputs[0]!.chainId).toBe(42161);
                expect(quotes[0]!.preview.outputs[0]!.chainId).toBe(8453);
            }
        }, 30_000);

        it("handles unsupported route gracefully", async () => {
            const quotes = await provider.getQuotes({
                user: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
                input: {
                    chainId: 1,
                    assetAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                    amount: "10000000",
                },
                output: {
                    chainId: 999999,
                    assetAddress: "0x0000000000000000000000000000000000000001",
                },
            });

            expect(quotes).toHaveLength(0);
        }, 30_000);
    });

    describe("factory creation", () => {
        it("creates via factory and can call getQuotes", async () => {
            const factoryProvider = createCrossChainProvider("lifi-intents", {
                orderServerUrl: ORDER_SERVER_URL,
            });

            expect(factoryProvider).toBeInstanceOf(LifiIntentsProvider);
            expect(factoryProvider.protocolName).toBe("lifi-intents");

            const quotes = await factoryProvider.getQuotes({
                user: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
                input: {
                    chainId: 1,
                    assetAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                    amount: "10000000",
                },
                output: {
                    chainId: 8453,
                    assetAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                },
            });

            expect(Array.isArray(quotes)).toBe(true);
            console.log(`Factory provider got ${quotes.length} quote(s)`);
        }, 30_000);
    });

    describe("getTrackingConfig", () => {
        it("returns valid tracking config", () => {
            const config = provider.getTrackingConfig();
            expect(config.openedIntentParserConfig.type).toBe("oif");
            expect(config.fillWatcherConfig.type).toBe("api-based");
        });
    });

    describe("getDiscoveryConfig - real API", () => {
        it("parseResponse works with real /routes data", async () => {
            const config = provider.getDiscoveryConfig();

            const response = await fetch(`${ORDER_SERVER_URL}/routes`);
            const data = await response.json();

            const result = config.config.parseResponse(data);

            console.log(
                `Discovery: ${result.length} chains, total ${result.reduce((s, r) => s + r.assets.length, 0)} assets`,
            );
            for (const chain of result) {
                console.log(
                    `  Chain ${chain.chainId}: ${chain.assets.length} assets [${chain.assets.map((a) => a.symbol || a.address.slice(0, 10)).join(", ")}]`,
                );
            }

            expect(result.length).toBeGreaterThan(0);
            for (const chain of result) {
                expect(chain.chainId).toBeGreaterThan(0);
                expect(chain.assets.length).toBeGreaterThan(0);
                for (const asset of chain.assets) {
                    expect(asset.address).toMatch(/^0x/);
                    expect(asset.decimals).toBeGreaterThanOrEqual(0);
                }
            }
        }, 15_000);
    });
});
