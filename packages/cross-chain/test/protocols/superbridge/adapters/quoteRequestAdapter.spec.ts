import { describe, expect, it } from "vitest";

import type { QuoteRequest } from "../../../../src/core/schemas/quoteRequest.js";
import { ProviderGetQuoteFailure } from "../../../../src/core/errors/ProviderGetQuoteFailure.exception.js";
import { NATIVE_ASSET_ADDRESS, NATIVE_ZERO_ADDRESS } from "../../../../src/core/utils/token.js";
import { adaptQuoteRequest } from "../../../../src/protocols/superbridge/adapters/quoteRequestAdapter.js";

const USER = "0x1234567890abcdef1234567890abcdef12345678";
const TOKEN = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

function req(overrides?: Partial<QuoteRequest>): QuoteRequest {
    return {
        user: USER,
        input: { chainId: 1, assetAddress: TOKEN, amount: "1000" },
        output: { chainId: 8453, assetAddress: TOKEN },
        ...overrides,
    };
}

describe("adaptQuoteRequest", () => {
    it("maps an SDK request to the routes body", () => {
        expect(adaptQuoteRequest(req())).toMatchObject({
            fromChainId: "1",
            toChainId: "8453",
            fromTokenAddress: TOKEN,
            toTokenAddress: TOKEN,
            amount: "1000",
            sender: USER,
            recipient: USER,
            slippage: 0,
        });
    });

    it("maps the native placeholder to the zero address", () => {
        const out = adaptQuoteRequest(
            req({ input: { chainId: 1, assetAddress: NATIVE_ASSET_ADDRESS, amount: "1000" } }),
        );
        expect(out.fromTokenAddress).toBe(NATIVE_ZERO_ADDRESS);
    });

    it("throws when the input amount is missing", () => {
        expect(() =>
            adaptQuoteRequest(req({ input: { chainId: 1, assetAddress: TOKEN } })),
        ).toThrow(ProviderGetQuoteFailure);
    });

    it("filters to canonical native route ids", () => {
        const out = adaptQuoteRequest(req());

        expect(out.routeIds).toContain("op-deposit-portal");
        expect(out.routeIds).toContain("ArbitrumWithdrawal");
        expect(out.routeIds).not.toContain("Across");
    });
});
