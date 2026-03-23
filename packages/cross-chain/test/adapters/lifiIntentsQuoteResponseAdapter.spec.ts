import { describe, expect, it } from "vitest";

import { adaptQuoteResponse } from "../../src/protocols/lifi-intents/adapters/quoteResponseAdapter.js";
import {
    getMockedLifiQuoteResponse,
    LIFI_ADDRESSES,
    LIFI_CHAIN_IDS,
} from "../mocks/lifi-intents/index.js";

const PROVIDER_ID = "lifi-intents-test";

describe("LI.FI Intents adaptQuoteResponse", () => {
    it("returns an SDK Quote with order steps", () => {
        const entry = getMockedLifiQuoteResponse().quotes[0]!;
        const quote = adaptQuoteResponse(entry, PROVIDER_ID);

        expect(quote.order).toBeDefined();
        expect(quote.order.steps).toBeDefined();
        expect(quote.order.steps.length).toBeGreaterThan(0);
    });

    it("produces a transaction step for oif-user-open-v0", () => {
        const entry = getMockedLifiQuoteResponse().quotes[0]!;
        const quote = adaptQuoteResponse(entry, PROVIDER_ID);

        expect(quote.order.steps[0]!.kind).toBe("transaction");
    });

    it("maps preview inputs correctly from flat format", () => {
        const entry = getMockedLifiQuoteResponse().quotes[0]!;
        const quote = adaptQuoteResponse(entry, PROVIDER_ID);

        expect(quote.preview.inputs).toHaveLength(1);
        expect(quote.preview.inputs[0]!.chainId).toBe(LIFI_CHAIN_IDS.BASE);
        expect(quote.preview.inputs[0]!.assetAddress).toBe(LIFI_ADDRESSES.USDC_BASE);
        expect(quote.preview.inputs[0]!.accountAddress).toBe(LIFI_ADDRESSES.USER);
        expect(quote.preview.inputs[0]!.amount).toBe("10000000");
    });

    it("maps preview outputs correctly from flat format", () => {
        const entry = getMockedLifiQuoteResponse().quotes[0]!;
        const quote = adaptQuoteResponse(entry, PROVIDER_ID);

        expect(quote.preview.outputs).toHaveLength(1);
        expect(quote.preview.outputs[0]!.chainId).toBe(LIFI_CHAIN_IDS.ARBITRUM);
        expect(quote.preview.outputs[0]!.assetAddress).toBe(LIFI_ADDRESSES.USDC_ARB);
        expect(quote.preview.outputs[0]!.accountAddress).toBe(LIFI_ADDRESSES.USER);
        expect(quote.preview.outputs[0]!.amount).toBe("9968269");
    });

    it("preserves metadata fields", () => {
        const entry = getMockedLifiQuoteResponse().quotes[0]!;
        const quote = adaptQuoteResponse(entry, PROVIDER_ID);

        expect(quote.provider).toBe(PROVIDER_ID);
        expect(quote.quoteId).toBe("quote_test123");
        expect(quote.failureHandling).toBe("refund-automatic");
        expect(quote.partialFill).toBe(false);
        expect(quote.metadata).toHaveProperty("exclusiveFor");
        expect(quote.metadata).toHaveProperty("lifiProvider", "LI.FI Intent");
    });

    it("throws when order is null", () => {
        const entry = {
            ...getMockedLifiQuoteResponse().quotes[0]!,
            order: null,
        };

        expect(() => adaptQuoteResponse(entry, PROVIDER_ID)).toThrow(
            "Expected oif-user-open-v0 order",
        );
    });

    it("throws when preview inputs are missing", () => {
        const entry = {
            ...getMockedLifiQuoteResponse().quotes[0]!,
            preview: { inputs: [], outputs: [] },
        };

        expect(() => adaptQuoteResponse(entry, PROVIDER_ID)).toThrow(
            "missing preview inputs/outputs",
        );
    });

    it("throws when order type is not oif-user-open-v0", () => {
        const base = getMockedLifiQuoteResponse().quotes[0]!;
        const entry = {
            ...base,
            order: { ...base.order!, type: "oif-escrow-v0" },
        };

        expect(() => adaptQuoteResponse(entry, PROVIDER_ID)).toThrow(
            "Expected oif-user-open-v0 order",
        );
    });

    it("throws when outputs are empty but inputs present", () => {
        const base = getMockedLifiQuoteResponse().quotes[0]!;
        const entry = {
            ...base,
            preview: { inputs: base.preview.inputs, outputs: [] },
        };

        expect(() => adaptQuoteResponse(entry, PROVIDER_ID)).toThrow(
            "missing preview inputs/outputs",
        );
    });
});
