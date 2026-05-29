import type { Address } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Quote } from "../../src/core/schemas/quote.js";
import type { BuildQuoteRequest, QuoteRequest } from "../../src/core/schemas/quoteRequest.js";
import { Aggregator, createAggregator, createSpenderValidator } from "../../src/external.js";
import { CrossChainProvider, UntrustedSpender } from "../../src/internal.js";

const USER = "0x1234567890abcdef1234567890abcdef12345678" as Address;
const TOKEN = "0x3333333333333333333333333333333333333333" as Address;
const TRUSTED = "0x1111111111111111111111111111111111111111" as Address;
const UNTRUSTED = "0x2222222222222222222222222222222222222222" as Address;

function spenderQuote(spender: string, quoteId: string): Quote {
    return {
        order: {
            steps: [
                {
                    kind: "transaction",
                    category: "approval",
                    chainId: 1,
                    transaction: { to: TOKEN, data: "0x" },
                },
            ],
            checks: {
                allowances: [
                    { chainId: 1, tokenAddress: TOKEN, owner: USER, spender, required: "1" },
                ],
            },
        },
        preview: {
            inputs: [{ chainId: 1, accountAddress: USER, assetAddress: TOKEN, amount: "100" }],
            outputs: [{ chainId: 10, accountAddress: USER, assetAddress: TOKEN, amount: "95" }],
        },
        provider: "test",
        quoteId,
    };
}

function settlerQuote(to: string, quoteId: string): Quote {
    return {
        order: { steps: [{ kind: "transaction", chainId: 1, transaction: { to, data: "0x" } }] },
        preview: {
            inputs: [{ chainId: 1, accountAddress: USER, assetAddress: TOKEN, amount: "100" }],
            outputs: [{ chainId: 10, accountAddress: USER, assetAddress: TOKEN, amount: "95" }],
        },
        provider: "test",
        quoteId,
    };
}

function getQuotesProvider(providerId: string, quotes: Quote[]): CrossChainProvider {
    return {
        protocolName: providerId,
        providerId,
        getProviderId: vi.fn(() => providerId),
        getProtocolName: vi.fn(() => providerId),
        getQuotes: vi.fn(() => Promise.resolve(quotes)),
        getDiscoveryConfig: vi.fn(() => null),
    } as unknown as CrossChainProvider;
}

const quoteParams = {
    user: USER,
    input: { chainId: 1, assetAddress: TOKEN, amount: "100" },
    output: { chainId: 10, assetAddress: TOKEN, amount: "95" },
} as unknown as QuoteRequest;

describe("Aggregator with spenderValidator", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("getQuotes", () => {
        it("drops quotes with an untrusted spender", async () => {
            const aggregator = createAggregator({
                providers: [
                    getQuotesProvider("A", [spenderQuote(UNTRUSTED, "a")]),
                    getQuotesProvider("B", [spenderQuote(TRUSTED, "b")]),
                ],
                spenderValidator: createSpenderValidator({ trustedSpenders: { 1: [TRUSTED] } }),
            });

            const { quotes } = await aggregator.getQuotes(quoteParams);

            expect(quotes).toHaveLength(1);
            expect(quotes[0]?.quoteId).toBe("b");
        });

        it("surfaces dropped quotes in the errors array", async () => {
            const aggregator = createAggregator({
                providers: [getQuotesProvider("A", [spenderQuote(UNTRUSTED, "a")])],
                spenderValidator: createSpenderValidator({ trustedSpenders: { 1: [TRUSTED] } }),
            });

            const { quotes, errors } = await aggregator.getQuotes(quoteParams);

            expect(quotes).toHaveLength(0);
            expect(errors).toHaveLength(1);
            const error = errors[0]?.error;
            expect(error).toBeInstanceOf(UntrustedSpender);
            expect((error as UntrustedSpender).field).toBe("spender");
            expect((error as UntrustedSpender).chainId).toBe(1);
        });

        it("validates the target of non-approval transaction steps", async () => {
            const aggregator = createAggregator({
                providers: [getQuotesProvider("A", [settlerQuote(UNTRUSTED, "a")])],
                spenderValidator: createSpenderValidator({ trustedSpenders: { 1: [TRUSTED] } }),
            });

            const { quotes, errors } = await aggregator.getQuotes(quoteParams);

            expect(quotes).toHaveLength(0);
            expect((errors[0]?.error as UntrustedSpender).field).toBe("transactionTo");
        });

        it("returns every quote when no spenderValidator is set", async () => {
            const aggregator = createAggregator({
                providers: [
                    getQuotesProvider("A", [spenderQuote(UNTRUSTED, "a")]),
                    getQuotesProvider("B", [spenderQuote(TRUSTED, "b")]),
                ],
            });

            const { quotes, errors } = await aggregator.getQuotes(quoteParams);

            expect(quotes).toHaveLength(2);
            expect(errors).toHaveLength(0);
        });
    });

    describe("buildQuote", () => {
        it("throws UntrustedSpender for an untrusted target", async () => {
            const provider = {
                protocolName: "A",
                providerId: "A",
                getProviderId: vi.fn(() => "A"),
                getProtocolName: vi.fn(() => "A"),
                getQuotes: vi.fn(() => Promise.resolve([])),
                buildQuote: vi.fn(() => Promise.resolve(spenderQuote(UNTRUSTED, "a"))),
                getDiscoveryConfig: vi.fn(() => null),
            } as unknown as CrossChainProvider;

            const aggregator = new Aggregator({
                providers: [provider],
                spenderValidator: createSpenderValidator({ trustedSpenders: { 1: [TRUSTED] } }),
            });

            const params = {
                user: USER,
                input: { chainId: 1, assetAddress: TOKEN, amount: "100" },
                output: { chainId: 10, assetAddress: TOKEN, amount: "95" },
                allowDangerousParameters: true,
            } as unknown as BuildQuoteRequest;

            await expect(aggregator.buildQuote("A", params)).rejects.toThrow(UntrustedSpender);
        });
    });
});
