import { describe, expect, it } from "vitest";

import type { QuoteRequest } from "../../../../src/core/schemas/quoteRequest.js";
import type { RelayQuoteResponse } from "../../../../src/protocols/relay/schemas.js";
import {
    adaptQuote,
    adaptRelaySteps,
} from "../../../../src/protocols/relay/adapters/quoteAdapter.js";

// ── Constants ────────────────────────────────────────────

const VALID_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";
const RECIPIENT_ADDRESS = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
const ORIGIN_CHAIN_ID = 1;
const DESTINATION_CHAIN_ID = 10;
const INPUT_AMOUNT = "1000000";
const OUTPUT_AMOUNT = "999000";
const TX_DATA = "0xdeadbeef";
const REQUEST_ID = "0xreq123";
const ORDER_ID = "0xorder456";
const TIME_ESTIMATE_SECONDS = 30;
const PROVIDER_ID = "relay";
const STEP_DESCRIPTION = "Approve and send";
const SAMPLE_GAS = "21000";
const SAMPLE_MAX_FEE_PER_GAS = "30000000000";
const SAMPLE_MAX_PRIORITY_FEE_PER_GAS = "1000000000";

// ── Helpers ──────────────────────────────────────────────

function makeQuoteRequest(overrides?: Partial<QuoteRequest>): QuoteRequest {
    return {
        user: VALID_ADDRESS,
        input: { chainId: ORIGIN_CHAIN_ID, assetAddress: VALID_ADDRESS, amount: INPUT_AMOUNT },
        output: { chainId: DESTINATION_CHAIN_ID, assetAddress: VALID_ADDRESS },
        ...overrides,
    };
}

function makeRelayQuoteResponse(overrides?: Partial<RelayQuoteResponse>): RelayQuoteResponse {
    return {
        steps: [
            {
                id: "deposit",
                action: "Confirm transaction",
                description: STEP_DESCRIPTION,
                kind: "transaction",
                requestId: REQUEST_ID,
                items: [
                    {
                        status: "incomplete",
                        data: {
                            to: VALID_ADDRESS,
                            data: TX_DATA,
                            value: INPUT_AMOUNT,
                            chainId: ORIGIN_CHAIN_ID,
                        },
                    },
                ],
            },
        ],
        details: {
            operation: "bridge",
            timeEstimate: TIME_ESTIMATE_SECONDS,
            currencyIn: {
                currency: {
                    chainId: ORIGIN_CHAIN_ID,
                    address: VALID_ADDRESS,
                    symbol: "USDC",
                    name: "USD Coin",
                    decimals: 6,
                },
                amount: INPUT_AMOUNT,
            },
            currencyOut: {
                currency: {
                    chainId: DESTINATION_CHAIN_ID,
                    address: VALID_ADDRESS,
                    symbol: "USDC",
                    name: "USD Coin",
                    decimals: 6,
                },
                amount: OUTPUT_AMOUNT,
            },
        },
        protocol: { v2: { orderId: ORDER_ID } },
        ...overrides,
    } as RelayQuoteResponse;
}

// ── Tests ────────────────────────────────────────────────

describe("adaptQuote", () => {
    it("maps provider, quoteId, eta, and static fields", () => {
        const quote = adaptQuote(makeQuoteRequest(), makeRelayQuoteResponse(), PROVIDER_ID);
        expect(quote.provider).toBe(PROVIDER_ID);
        expect(quote.quoteId).toBe(ORDER_ID);
        expect(quote.eta).toBe(TIME_ESTIMATE_SECONDS);
        expect(quote.partialFill).toBe(false);
        expect(quote.failureHandling).toBe("refund-automatic");
    });

    it("maps input preview from response details", () => {
        const quote = adaptQuote(makeQuoteRequest(), makeRelayQuoteResponse(), PROVIDER_ID);
        expect(quote.preview.inputs[0]!.chainId).toBe(ORIGIN_CHAIN_ID);
        expect(quote.preview.inputs[0]!.accountAddress).toBe(VALID_ADDRESS);
        expect(quote.preview.inputs[0]!.amount).toBe(INPUT_AMOUNT);
    });

    it("maps output preview from response details", () => {
        const quote = adaptQuote(makeQuoteRequest(), makeRelayQuoteResponse(), PROVIDER_ID);
        expect(quote.preview.outputs[0]!.chainId).toBe(DESTINATION_CHAIN_ID);
        expect(quote.preview.outputs[0]!.amount).toBe(OUTPUT_AMOUNT);
    });

    it("uses recipient as output accountAddress when provided", () => {
        const quote = adaptQuote(
            makeQuoteRequest({
                output: {
                    chainId: DESTINATION_CHAIN_ID,
                    assetAddress: VALID_ADDRESS,
                    recipient: RECIPIENT_ADDRESS,
                },
            }),
            makeRelayQuoteResponse(),
            PROVIDER_ID,
        );
        expect(quote.preview.outputs[0]!.accountAddress).toBe(RECIPIENT_ADDRESS);
    });

    it("falls back to request params when details is missing", () => {
        const quote = adaptQuote(
            makeQuoteRequest(),
            makeRelayQuoteResponse({ details: undefined }),
            PROVIDER_ID,
        );
        expect(quote.eta).toBeUndefined();
        expect(quote.preview.inputs[0]!.amount).toBe(INPUT_AMOUNT);
        expect(quote.preview.outputs[0]!.amount).toBe("0");
    });

    it("sets quoteId to undefined when protocol.v2 is missing", () => {
        const quote = adaptQuote(
            makeQuoteRequest(),
            makeRelayQuoteResponse({ protocol: undefined }),
            PROVIDER_ID,
        );
        expect(quote.quoteId).toBeUndefined();
    });

    it("includes relayRequestId in order metadata from deposit step", () => {
        const quote = adaptQuote(makeQuoteRequest(), makeRelayQuoteResponse(), PROVIDER_ID);
        expect(quote.order.metadata).toEqual({ relayRequestId: REQUEST_ID });
    });

    it("stores raw relay response in metadata", () => {
        const response = makeRelayQuoteResponse();
        const quote = adaptQuote(makeQuoteRequest(), response, PROVIDER_ID);
        expect(quote.metadata!.relayResponse).toBe(response);
    });
});

describe("adaptRelaySteps", () => {
    const baseStep = makeRelayQuoteResponse().steps[0]!;

    it("maps incomplete transaction items to SDK steps", () => {
        const steps = adaptRelaySteps(baseStep);
        expect(steps).toHaveLength(1);
        expect(steps[0]!.kind).toBe("transaction");
        if (steps[0]!.kind === "transaction") {
            expect(steps[0]!.transaction.to).toBe(VALID_ADDRESS);
            expect(steps[0]!.transaction.data).toBe(TX_DATA);
            expect(steps[0]!.description).toBe(STEP_DESCRIPTION);
        }
    });

    it("filters out complete items", () => {
        const items = [
            { ...baseStep.items[0]!, status: "complete" as const },
            { ...baseStep.items[0]!, status: "incomplete" as const },
        ];
        const steps = adaptRelaySteps({ ...baseStep, items });
        expect(steps).toHaveLength(1);
    });

    it("returns empty array for signature steps", () => {
        const sigStep = {
            ...baseStep,
            kind: "signature" as const,
            items: [{ status: "incomplete" as const, data: {} }],
        };
        expect(adaptRelaySteps(sigStep)).toHaveLength(0);
    });

    it("maps gas parameters when present", () => {
        const items = [
            {
                ...baseStep.items[0]!,
                data: {
                    ...baseStep.items[0]!.data,
                    gas: SAMPLE_GAS,
                    maxFeePerGas: SAMPLE_MAX_FEE_PER_GAS,
                    maxPriorityFeePerGas: SAMPLE_MAX_PRIORITY_FEE_PER_GAS,
                },
            },
        ];
        const steps = adaptRelaySteps({ ...baseStep, items });
        if (steps[0]!.kind === "transaction") {
            expect(steps[0]!.transaction.gas).toBe(SAMPLE_GAS);
            expect(steps[0]!.transaction.maxFeePerGas).toBe(SAMPLE_MAX_FEE_PER_GAS);
            expect(steps[0]!.transaction.maxPriorityFeePerGas).toBe(
                SAMPLE_MAX_PRIORITY_FEE_PER_GAS,
            );
        }
    });

    it("omits gas when value is '0'", () => {
        const items = [
            {
                ...baseStep.items[0]!,
                data: { ...baseStep.items[0]!.data, gas: "0" },
            },
        ];
        const steps = adaptRelaySteps({ ...baseStep, items });
        if (steps[0]!.kind === "transaction") {
            expect(steps[0]!.transaction.gas).toBeUndefined();
        }
    });

    it("maps multiple incomplete items to separate steps", () => {
        const items = [
            baseStep.items[0]!,
            {
                ...baseStep.items[0]!,
                data: { ...baseStep.items[0]!.data, chainId: DESTINATION_CHAIN_ID },
            },
        ];
        const steps = adaptRelaySteps({ ...baseStep, items });
        expect(steps).toHaveLength(2);
    });
});
