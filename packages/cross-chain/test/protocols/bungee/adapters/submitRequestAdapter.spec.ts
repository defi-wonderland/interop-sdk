import { describe, expect, it } from "vitest";

import type { Quote } from "../../../../src/core/schemas/quote.js";
import type { BungeeAutoRoute } from "../../../../src/protocols/bungee/schemas.js";
import { ProviderExecuteFailure } from "../../../../src/core/errors/ProviderExecuteFailure.exception.js";
import { buildSubmitRequest } from "../../../../src/protocols/bungee/adapters/submitRequestAdapter.js";

// ── Helpers ─────────────────────────────────────────────

function makeAutoRoute(overrides: Record<string, unknown> = {}): BungeeAutoRoute {
    return {
        userOp: "sign",
        requestHash: "0xfallbackhash",
        output: {
            token: { chainId: 10, address: "0xtoken", name: "USDC", symbol: "USDC", decimals: 6 },
            amount: "999000",
            priceInUsd: 1,
            valueInUsd: 0.999,
            minAmountOut: "998000",
            effectiveReceivedInUsd: 0.998,
        },
        requestType: "SINGLE_OUTPUT_REQUEST",
        signTypedData: {
            domain: { name: "Permit2" },
            types: {},
            values: { witness: { field: "value" } },
        },
        slippage: 0.5,
        estimatedTime: 30,
        routeDetails: { name: "Bungee Protocol", logoURI: "" },
        quoteId: "quote-abc",
        quoteExpiry: 1700000000,
        routeTags: ["MAX_OUTPUT"],
        ...overrides,
    } as BungeeAutoRoute;
}

function makeQuote(autoRoute?: BungeeAutoRoute): Quote {
    return {
        provider: "bungee",
        order: { steps: [] },
        preview: { inputs: [], outputs: [] },
        partialFill: false,
        failureHandling: "refund-automatic",
        metadata: {
            bungeeAutoRoute: autoRoute ?? makeAutoRoute(),
        },
    };
}

// ── Tests ───────────────────────────────────────────────

describe("buildSubmitRequest", () => {
    it("extracts witness, quoteId, and requestType from quote metadata", () => {
        const quote = makeQuote();
        const { request, autoRoute } = buildSubmitRequest(quote, "0xsignature");

        expect(request).toEqual({
            request: { field: "value" },
            userSignature: "0xsignature",
            requestType: "SINGLE_OUTPUT_REQUEST",
            quoteId: "quote-abc",
        });
        expect(autoRoute.quoteId).toBe("quote-abc");
    });

    it("throws ProviderExecuteFailure when bungeeAutoRoute metadata is missing", () => {
        const quote: Quote = {
            provider: "bungee",
            order: { steps: [] },
            preview: { inputs: [], outputs: [] },
            partialFill: false,
            failureHandling: "refund-automatic",
            metadata: {},
        };

        expect(() => buildSubmitRequest(quote, "0xsig")).toThrow(ProviderExecuteFailure);
    });

    it("defaults witness to empty object when signTypedData is absent", () => {
        const autoRoute = makeAutoRoute({ signTypedData: null });
        const quote = makeQuote(autoRoute);
        const { request } = buildSubmitRequest(quote, "0xsig");

        expect(request.request).toEqual({});
    });

    it("defaults witness to empty object when values.witness is absent", () => {
        const autoRoute = makeAutoRoute({
            signTypedData: { domain: {}, types: {}, values: {} },
        });
        const quote = makeQuote(autoRoute);
        const { request } = buildSubmitRequest(quote, "0xsig");

        expect(request.request).toEqual({});
    });

    it("passes SWAP_REQUEST requestType through", () => {
        const autoRoute = makeAutoRoute({ requestType: "SWAP_REQUEST" });
        const quote = makeQuote(autoRoute);
        const { request } = buildSubmitRequest(quote, "0xsig");

        expect(request.requestType).toBe("SWAP_REQUEST");
    });
});
