import { describe, expect, it } from "vitest";

import type {
    BungeeAutoRoute,
    BungeeSubmitResponse,
} from "../../../../src/protocols/bungee/schemas.js";
import { adaptSubmitResponse } from "../../../../src/protocols/bungee/adapters/submitResponseAdapter.js";

// ── Helpers ─────────────────────────────────────────────

function makeAutoRoute(): BungeeAutoRoute {
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
        slippage: 0.5,
        estimatedTime: 30,
        routeDetails: { name: "Bungee Protocol", logoURI: "" },
        quoteId: "quote-abc",
        quoteExpiry: 1700000000,
        routeTags: ["MAX_OUTPUT"],
    } as BungeeAutoRoute;
}

function makeSubmitResponse(overrides: Partial<BungeeSubmitResponse> = {}): BungeeSubmitResponse {
    return {
        success: true,
        statusCode: 200,
        result: { hash: "0xsubmithash" },
        ...overrides,
    };
}

// ── Tests ───────────────────────────────────────────────

describe("adaptSubmitResponse", () => {
    const autoRoute = makeAutoRoute();

    it("extracts hash from single-object result", () => {
        const response = makeSubmitResponse({ result: { hash: "0xhash1" } });
        const result = adaptSubmitResponse(response, autoRoute);

        expect(result.orderId).toBe("0xhash1");
        expect(result.status).toBe("submitted");
    });

    it("extracts hash from first element of array result", () => {
        const response = makeSubmitResponse({
            result: [{ hash: "0xhash1" }, { hash: "0xhash2" }],
        });
        const result = adaptSubmitResponse(response, autoRoute);

        expect(result.orderId).toBe("0xhash1");
    });

    it("falls back to requestHash from result entry when hash is absent", () => {
        const response = makeSubmitResponse({ result: { requestHash: "0xreqhash" } });
        const result = adaptSubmitResponse(response, autoRoute);

        expect(result.orderId).toBe("0xreqhash");
    });

    it("falls back to autoRoute.requestHash when result has neither hash nor requestHash", () => {
        const response = makeSubmitResponse({ result: {} });
        const result = adaptSubmitResponse(response, autoRoute);

        expect(result.orderId).toBe("0xfallbackhash");
    });

    it("sets status to 'failed' when response.success is false", () => {
        const response = makeSubmitResponse({ success: false });
        const result = adaptSubmitResponse(response, autoRoute);

        expect(result.status).toBe("failed");
    });

    it("converts null message to undefined", () => {
        const response = makeSubmitResponse({ message: null });
        const result = adaptSubmitResponse(response, autoRoute);

        expect(result.message).toBeUndefined();
    });

    it("passes through message string", () => {
        const response = makeSubmitResponse({ message: "Order accepted" });
        const result = adaptSubmitResponse(response, autoRoute);

        expect(result.message).toBe("Order accepted");
    });
});
