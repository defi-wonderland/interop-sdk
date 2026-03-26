import type { GetQuoteRequest, GetQuoteResponse, Order } from "@openintentsframework/oif-specs";
import { describe, expect, it } from "vitest";

import { validateOifPayload } from "../../src/protocols/oif/validators/oifPayloadValidator.js";
import {
    AMOUNTS,
    ATTACKER_ADDRESSES,
    ATTACKER_INTEROP_ADDRESSES,
    getMockedOif3009QuoteResponse,
    getMockedOifQuoteResponse,
    getMockedOifResourceLockQuoteResponse,
    getMockedOifUserOpenQuoteResponse,
} from "../mocks/oif/index.js";

/** Extracts the order from a mocked quote response (mocks always return exactly one quote) */
function getOrder(response: GetQuoteResponse): Order {
    const quote = response.quotes[0];
    if (!quote) throw new Error("Test mock must return at least one quote");
    return quote.order;
}

/**
 * Creates a GetQuoteRequest from a quote response for validation testing.
 * This simulates what the user originally requested before the solver responded.
 */
function createIntentFromQuote(
    quote: ReturnType<typeof getMockedOifQuoteResponse>,
    orderType: string,
): GetQuoteRequest {
    const q = quote.quotes[0];
    if (!q) throw new Error("Test mock must return at least one quote");
    const input = q.preview.inputs[0];
    const output = q.preview.outputs[0];
    if (!input || !output) throw new Error("Test mock must have input and output");

    return {
        user: input.user,
        intent: {
            intentType: "oif-swap",
            inputs: [{ user: input.user, asset: input.asset, amount: input.amount }],
            outputs: [{ receiver: output.receiver, asset: output.asset, amount: output.amount }],
            swapType: "exact-input",
        },
        supportedTypes: [orderType],
    };
}

describe("validateOifPayload", () => {
    describe("oif-escrow-v0", () => {
        it("returns true when order matches intent", async () => {
            const response = getMockedOifQuoteResponse();
            const intent = createIntentFromQuote(response, "oif-escrow-v0");
            const order = getOrder(response);

            await expect(validateOifPayload(intent, order)).resolves.toBe(true);
        });

        it("rejects when attacker swaps token in encoded message", async () => {
            const validResponse = getMockedOifQuoteResponse();
            const intent = createIntentFromQuote(validResponse, "oif-escrow-v0");

            const attackResponse = getMockedOifQuoteResponse({ token: ATTACKER_ADDRESSES.TOKEN });
            const corruptedOrder = getOrder(attackResponse);

            await expect(validateOifPayload(intent, corruptedOrder)).resolves.toBe(false);
        });

        it("rejects when attacker inflates amount in encoded message", async () => {
            const validResponse = getMockedOifQuoteResponse();
            const intent = createIntentFromQuote(validResponse, "oif-escrow-v0");

            const attackResponse = getMockedOifQuoteResponse({ amount: AMOUNTS.STOLEN });
            const corruptedOrder = getOrder(attackResponse);

            await expect(validateOifPayload(intent, corruptedOrder)).resolves.toBe(false);
        });
    });

    describe("oif-resource-lock-v0", () => {
        it("returns true when order matches intent", async () => {
            const response = getMockedOifResourceLockQuoteResponse();
            const intent = createIntentFromQuote(response, "oif-resource-lock-v0");
            const order = getOrder(response);

            await expect(validateOifPayload(intent, order)).resolves.toBe(true);
        });

        it("rejects when attacker swaps token in commitments", async () => {
            const validResponse = getMockedOifResourceLockQuoteResponse();
            const intent = createIntentFromQuote(validResponse, "oif-resource-lock-v0");

            const attackResponse = getMockedOifResourceLockQuoteResponse({
                token: ATTACKER_ADDRESSES.TOKEN,
            });
            const corruptedOrder = getOrder(attackResponse);

            await expect(validateOifPayload(intent, corruptedOrder)).resolves.toBe(false);
        });

        it("rejects when attacker inflates amount in commitments", async () => {
            const validResponse = getMockedOifResourceLockQuoteResponse();
            const intent = createIntentFromQuote(validResponse, "oif-resource-lock-v0");

            const attackResponse = getMockedOifResourceLockQuoteResponse({
                amount: AMOUNTS.STOLEN,
            });
            const corruptedOrder = getOrder(attackResponse);

            await expect(validateOifPayload(intent, corruptedOrder)).resolves.toBe(false);
        });

        it("rejects when attacker changes sponsor to different user", async () => {
            const validResponse = getMockedOifResourceLockQuoteResponse();
            const intent = createIntentFromQuote(validResponse, "oif-resource-lock-v0");

            const attackResponse = getMockedOifResourceLockQuoteResponse({
                sponsor: ATTACKER_ADDRESSES.USER,
            });
            const corruptedOrder = getOrder(attackResponse);

            await expect(validateOifPayload(intent, corruptedOrder)).resolves.toBe(false);
        });
    });

    describe("oif-3009-v0", () => {
        it("returns true when order matches intent", async () => {
            const response = getMockedOif3009QuoteResponse();
            const intent = createIntentFromQuote(response, "oif-3009-v0");
            const order = getOrder(response);

            await expect(validateOifPayload(intent, order)).resolves.toBe(true);
        });

        it("rejects when attacker changes from address to different user", async () => {
            const validResponse = getMockedOif3009QuoteResponse();
            const intent = createIntentFromQuote(validResponse, "oif-3009-v0");

            const attackResponse = getMockedOif3009QuoteResponse({
                from: ATTACKER_ADDRESSES.USER,
            });
            const corruptedOrder = getOrder(attackResponse);

            await expect(validateOifPayload(intent, corruptedOrder)).resolves.toBe(false);
        });

        it("rejects when attacker inflates value in message", async () => {
            const validResponse = getMockedOif3009QuoteResponse();
            const intent = createIntentFromQuote(validResponse, "oif-3009-v0");

            const attackResponse = getMockedOif3009QuoteResponse({
                value: AMOUNTS.STOLEN,
            });
            const corruptedOrder = getOrder(attackResponse);

            await expect(validateOifPayload(intent, corruptedOrder)).resolves.toBe(false);
        });

        it("rejects when attacker swaps tokenAddress in metadata", async () => {
            const validResponse = getMockedOif3009QuoteResponse();
            const intent = createIntentFromQuote(validResponse, "oif-3009-v0");

            const attackResponse = getMockedOif3009QuoteResponse({
                tokenAddress: ATTACKER_ADDRESSES.TOKEN,
            });
            const corruptedOrder = getOrder(attackResponse);

            await expect(validateOifPayload(intent, corruptedOrder)).resolves.toBe(false);
        });
    });

    describe("oif-user-open-v0 (Direct Transaction)", () => {
        it("returns true when order matches intent", async () => {
            const response = getMockedOifUserOpenQuoteResponse();
            const intent = createIntentFromQuote(response, "oif-user-open-v0");
            const order = getOrder(response);

            await expect(validateOifPayload(intent, order)).resolves.toBe(true);
        });

        it("rejects when openIntentTx.to differs from allowances.spender", async () => {
            const validResponse = getMockedOifUserOpenQuoteResponse();
            const intent = createIntentFromQuote(validResponse, "oif-user-open-v0");

            // oif-user-open-v0 uses EIP-7930 addresses (no EIP-712 payload)
            const attackResponse = getMockedOifUserOpenQuoteResponse({
                txTo: ATTACKER_INTEROP_ADDRESSES.TOKEN,
            });
            const corruptedOrder = getOrder(attackResponse);

            await expect(validateOifPayload(intent, corruptedOrder)).resolves.toBe(false);
        });

        it("rejects when allowances.token differs from intent token", async () => {
            const validResponse = getMockedOifUserOpenQuoteResponse();
            const intent = createIntentFromQuote(validResponse, "oif-user-open-v0");

            const attackResponse = getMockedOifUserOpenQuoteResponse({
                allowanceToken: ATTACKER_INTEROP_ADDRESSES.TOKEN,
            });
            const corruptedOrder = getOrder(attackResponse);

            await expect(validateOifPayload(intent, corruptedOrder)).resolves.toBe(false);
        });

        it("rejects when allowances.user differs from intent user", async () => {
            const validResponse = getMockedOifUserOpenQuoteResponse();
            const intent = createIntentFromQuote(validResponse, "oif-user-open-v0");

            const attackResponse = getMockedOifUserOpenQuoteResponse({
                allowanceUser: ATTACKER_INTEROP_ADDRESSES.USER,
            });
            const corruptedOrder = getOrder(attackResponse);

            await expect(validateOifPayload(intent, corruptedOrder)).resolves.toBe(false);
        });

        it("rejects when allowances.required exceeds intent amount", async () => {
            const validResponse = getMockedOifUserOpenQuoteResponse();
            const intent = createIntentFromQuote(validResponse, "oif-user-open-v0");

            const attackResponse = getMockedOifUserOpenQuoteResponse({
                allowanceRequired: AMOUNTS.STOLEN,
            });
            const corruptedOrder = getOrder(attackResponse);

            await expect(validateOifPayload(intent, corruptedOrder)).resolves.toBe(false);
        });
    });

    describe("malformed data handling", () => {
        it("rejects when intent has no inputs", async () => {
            const response = getMockedOifQuoteResponse();
            const intent = createIntentFromQuote(response, "oif-escrow-v0");
            intent.intent.inputs = [];
            const order = getOrder(response);

            await expect(validateOifPayload(intent, order)).resolves.toBe(false);
        });

        it("rejects unknown order types for security", async () => {
            const response = getMockedOifQuoteResponse();
            const intent = createIntentFromQuote(response, "oif-unknown-v99");
            const unknownOrder = {
                type: "oif-unknown-v99",
                payload: { something: "unknown" },
            } as unknown as Order;

            await expect(validateOifPayload(intent, unknownOrder)).resolves.toBe(false);
        });
    });
});
