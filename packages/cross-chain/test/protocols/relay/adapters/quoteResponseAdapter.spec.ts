import { encodeFunctionData, erc20Abi } from "viem";
import { describe, expect, it } from "vitest";

import type { QuoteRequest } from "../../../../src/core/schemas/quoteRequest.js";
import type {
    RelayQuoteResponse,
    RelayQuoteStep,
} from "../../../../src/protocols/relay/schemas.js";
import { ProviderGetQuoteFailure } from "../../../../src/core/errors/ProviderGetQuoteFailure.exception.js";
import {
    adaptQuote,
    adaptRelaySteps,
} from "../../../../src/protocols/relay/adapters/quoteResponseAdapter.js";

// ── Constants ────────────────────────────────────────────

const VALID_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";
const RECIPIENT_ADDRESS = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
const SPENDER_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
const PERMIT2_ADDRESS_FIXTURE = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
const RELAY_SOLVER_FIXTURE = "0xCCC88a9d1B4ed6b0eABA998850414b24F1C315bE";
const TOKEN_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
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

function makeApproveCalldata(spender: string, amount: bigint): string {
    return encodeFunctionData({
        abi: erc20Abi,
        functionName: "approve",
        args: [spender as `0x${string}`, amount],
    });
}

// ── Tests ────────────────────────────────────────────────

describe("adaptQuote", () => {
    it("maps a complete Relay response to SDK Quote", () => {
        const quote = adaptQuote(makeQuoteRequest(), makeRelayQuoteResponse(), PROVIDER_ID);

        expect(quote.provider).toBe(PROVIDER_ID);
        expect(quote.quoteId).toBe(ORDER_ID);
        expect(quote.eta).toBe(TIME_ESTIMATE_SECONDS);
        expect(quote.partialFill).toBe(false);
        expect(quote.failureHandling).toBe("refund-automatic");
        expect(quote.preview.inputs[0]!.chainId).toBe(ORIGIN_CHAIN_ID);
        expect(quote.preview.inputs[0]!.amount).toBe(INPUT_AMOUNT);
        expect(quote.preview.outputs[0]!.chainId).toBe(DESTINATION_CHAIN_ID);
        expect(quote.preview.outputs[0]!.amount).toBe(OUTPUT_AMOUNT);
        expect(quote.tracking).toEqual({ orderId: REQUEST_ID });
        expect(quote.metadata!.relayResponse).toBeDefined();
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

    it("falls back to request params when response details is missing", () => {
        const quote = adaptQuote(
            makeQuoteRequest(),
            makeRelayQuoteResponse({ details: undefined }),
            PROVIDER_ID,
        );
        expect(quote.eta).toBeUndefined();
        expect(quote.preview.inputs[0]!.amount).toBe(INPUT_AMOUNT);
        expect(quote.preview.outputs[0]!.amount).toBe("0");
        expect(quote.preview.inputs[0]!.amountUsd).toBeUndefined();
        expect(quote.preview.outputs[0]!.amountUsd).toBeUndefined();
    });

    it("maps amountUsd from details.currencyIn and currencyOut", () => {
        const baseResponse = makeRelayQuoteResponse();
        const response: RelayQuoteResponse = {
            ...baseResponse,
            details: {
                ...baseResponse.details!,
                currencyIn: { ...baseResponse.details!.currencyIn!, amountUsd: "10.50" },
                currencyOut: { ...baseResponse.details!.currencyOut!, amountUsd: "10.45" },
            },
        };

        const quote = adaptQuote(makeQuoteRequest(), response, PROVIDER_ID);

        expect(quote.preview.inputs[0]!.amountUsd).toBe("10.50");
        expect(quote.preview.outputs[0]!.amountUsd).toBe("10.45");
    });

    it("leaves amountUsd undefined when raw response omits it", () => {
        const quote = adaptQuote(makeQuoteRequest(), makeRelayQuoteResponse(), PROVIDER_ID);

        expect(quote.preview.inputs[0]!.amountUsd).toBeUndefined();
        expect(quote.preview.outputs[0]!.amountUsd).toBeUndefined();
    });

    it("exposes currencyOut.minimumAmount as the slippage floor", () => {
        const baseResponse = makeRelayQuoteResponse();
        const { details } = baseResponse;
        if (!details?.currencyOut) throw new Error("fixture is missing currencyOut");
        const response: RelayQuoteResponse = {
            ...baseResponse,
            details: {
                ...details,
                currencyOut: { ...details.currencyOut, minimumAmount: "990000" },
            },
        };

        const quote = adaptQuote(makeQuoteRequest(), response, PROVIDER_ID);

        expect(quote.preview.outputs[0]?.minAmount).toBe("990000");
    });

    it("leaves minAmount undefined when the provider omits minimumAmount", () => {
        const quote = adaptQuote(makeQuoteRequest(), makeRelayQuoteResponse(), PROVIDER_ID);

        expect(quote.preview.outputs[0]?.minAmount).toBeUndefined();
    });

    it("handles missing protocol.v2 gracefully", () => {
        const quote = adaptQuote(
            makeQuoteRequest(),
            makeRelayQuoteResponse({ protocol: undefined }),
            PROVIDER_ID,
        );
        expect(quote.quoteId).toBeUndefined();
    });

    it("splits approve steps into order.checks.allowances and keeps the rest in order.steps", () => {
        const approveAmount = 1000000n;
        const approveCalldata = makeApproveCalldata(SPENDER_ADDRESS, approveAmount);

        const response = makeRelayQuoteResponse({
            steps: [
                {
                    id: "approve",
                    action: "Approve token",
                    description: "Approve USDC",
                    kind: "transaction",
                    items: [
                        {
                            status: "incomplete",
                            data: {
                                to: TOKEN_ADDRESS,
                                data: approveCalldata,
                                chainId: ORIGIN_CHAIN_ID,
                            },
                        },
                    ],
                },
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
        });

        const quote = adaptQuote(makeQuoteRequest(), response, PROVIDER_ID);

        expect(quote.order.checks?.allowances).toEqual([
            {
                chainId: ORIGIN_CHAIN_ID,
                tokenAddress: TOKEN_ADDRESS,
                owner: VALID_ADDRESS,
                spender: SPENDER_ADDRESS,
                required: approveAmount.toString(),
            },
        ]);
        expect(quote.order.steps).toHaveLength(1);
        expect(quote.order.steps[0]).toMatchObject({
            kind: "transaction",
            transaction: { to: VALID_ADDRESS },
        });
    });

    it("order.checks is undefined when there are no approve steps", () => {
        const quote = adaptQuote(makeQuoteRequest(), makeRelayQuoteResponse(), PROVIDER_ID);
        expect(quote.order.checks).toBeUndefined();
    });

    it("leaves fallbackToken undefined when refundCurrency is absent", () => {
        const quote = adaptQuote(makeQuoteRequest(), makeRelayQuoteResponse(), PROVIDER_ID);
        expect(quote.fallbackToken).toBeUndefined();
    });

    it("populates fallbackToken from details.refundCurrency", () => {
        const refundToken = "0x3333333333333333333333333333333333333333";
        const refundAmount = "987000";
        const base = makeRelayQuoteResponse();
        const response = makeRelayQuoteResponse({
            details: {
                ...base.details!,
                refundCurrency: {
                    currency: {
                        chainId: DESTINATION_CHAIN_ID,
                        address: refundToken,
                        symbol: "USDC",
                        name: "USD Coin",
                        decimals: 6,
                    },
                    amount: refundAmount,
                },
            },
        });

        const quote = adaptQuote(
            makeQuoteRequest({
                output: {
                    chainId: DESTINATION_CHAIN_ID,
                    assetAddress: VALID_ADDRESS,
                    recipient: RECIPIENT_ADDRESS,
                },
            }),
            response,
            PROVIDER_ID,
        );

        expect(quote.fallbackToken).toEqual({
            chainId: DESTINATION_CHAIN_ID,
            accountAddress: RECIPIENT_ADDRESS,
            assetAddress: refundToken,
            amount: refundAmount,
        });
    });

    it("drops fallbackToken when refundCurrency matches the input token and chain", () => {
        const base = makeRelayQuoteResponse();
        const response = makeRelayQuoteResponse({
            details: {
                ...base.details!,
                refundCurrency: {
                    currency: {
                        chainId: ORIGIN_CHAIN_ID,
                        address: VALID_ADDRESS.toUpperCase(),
                        symbol: "USDC",
                        name: "USD Coin",
                        decimals: 6,
                    },
                    amount: INPUT_AMOUNT,
                },
            },
        });

        const quote = adaptQuote(makeQuoteRequest(), response, PROVIDER_ID);
        expect(quote.fallbackToken).toBeUndefined();
    });
});

describe("adaptRelaySteps", () => {
    const baseStep = makeRelayQuoteResponse().steps[0]!;
    const params = makeQuoteRequest();

    it("maps incomplete transaction items to SDK steps", () => {
        const steps = adaptRelaySteps(baseStep, params);
        expect(steps).toHaveLength(1);
        expect(steps[0]).toMatchObject({
            kind: "transaction",
            chainId: ORIGIN_CHAIN_ID,
            description: STEP_DESCRIPTION,
            transaction: { to: VALID_ADDRESS, data: TX_DATA },
        });
    });

    it("filters out complete items", () => {
        const withComplete = [
            { ...baseStep.items[0]!, status: "complete" as const },
            { ...baseStep.items[0]!, status: "incomplete" as const },
        ];
        expect(adaptRelaySteps({ ...baseStep, items: withComplete }, params)).toHaveLength(1);
    });

    it("includes gas params when present and omits when '0'", () => {
        const withGas = [
            {
                ...baseStep.items[0]!,
                data: {
                    ...baseStep.items[0]!.data,
                    gas: "21000",
                    maxFeePerGas: "30000000000",
                },
            },
        ];
        const steps = adaptRelaySteps({ ...baseStep, items: withGas }, params);
        if (steps[0]!.kind === "transaction") {
            expect(steps[0]!.transaction.gas).toBe("21000");
            expect(steps[0]!.transaction.maxFeePerGas).toBe("30000000000");
        }

        const withZeroGas = [
            { ...baseStep.items[0]!, data: { ...baseStep.items[0]!.data, gas: "0" } },
        ];
        const zeroSteps = adaptRelaySteps({ ...baseStep, items: withZeroGas }, params);
        if (zeroSteps[0]!.kind === "transaction") {
            expect(zeroSteps[0]!.transaction.gas).toBeUndefined();
        }
    });
});

// ── Signature Step Tests ────────────────────────────────

const FUTURE_DEADLINE = Math.floor(Date.now() / 1000) + 3600;

const EIP712_DOMAIN = {
    name: "Permit2",
    chainId: ORIGIN_CHAIN_ID,
    verifyingContract: PERMIT2_ADDRESS_FIXTURE,
};

const EIP712_TYPES = {
    PermitTransferFrom: [
        { name: "permitted", type: "TokenPermissions" },
        { name: "spender", type: "address" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
    ],
    TokenPermissions: [
        { name: "token", type: "address" },
        { name: "amount", type: "uint256" },
    ],
};

const EIP712_VALUE = {
    permitted: { token: VALID_ADDRESS, amount: INPUT_AMOUNT },
    spender: RELAY_SOLVER_FIXTURE,
    nonce: "1",
    deadline: FUTURE_DEADLINE,
};

const POST_DATA = {
    endpoint: "/execute/permits",
    method: "POST",
    body: { kind: "eip712", requestId: REQUEST_ID },
};

function makeSignatureStep(overrides?: Partial<RelayQuoteStep>): RelayQuoteStep {
    return {
        id: "authorize1",
        action: "Authorize permit",
        description: "Sign permit to authorize",
        kind: "signature",
        requestId: REQUEST_ID,
        items: [
            {
                status: "incomplete",
                data: {
                    sign: {
                        signatureKind: "eip712",
                        domain: EIP712_DOMAIN,
                        types: EIP712_TYPES,
                        value: EIP712_VALUE,
                        primaryType: "PermitTransferFrom",
                    },
                    post: POST_DATA,
                },
            },
        ],
        ...overrides,
    } as RelayQuoteStep;
}

describe("adaptRelaySteps — signature steps", () => {
    const params = makeQuoteRequest();

    it("maps EIP-712 signature step to SDK SignatureStep", () => {
        const steps = adaptRelaySteps(makeSignatureStep(), params);
        expect(steps).toHaveLength(1);
        expect(steps[0]!.kind).toBe("signature");

        if (steps[0]!.kind === "signature") {
            expect(steps[0]!.chainId).toBe(ORIGIN_CHAIN_ID);
            expect(steps[0]!.description).toBe("Sign permit to authorize");
            expect(steps[0]!.signaturePayload.signatureType).toBe("eip712");
            expect(steps[0]!.signaturePayload.domain).toEqual(EIP712_DOMAIN);
            expect(steps[0]!.signaturePayload.primaryType).toBe("PermitTransferFrom");
            expect(steps[0]!.signaturePayload.types).toEqual(EIP712_TYPES);
            expect(steps[0]!.signaturePayload.message).toEqual(EIP712_VALUE);
        }
    });

    it("throws ProviderGetQuoteFailure for unsupported EIP-191 signature items", () => {
        const eip191Step = makeSignatureStep({
            items: [
                {
                    status: "incomplete",
                    data: {
                        sign: { signatureKind: "eip191", message: "Sign this" },
                        post: POST_DATA,
                    },
                },
            ],
        } as Partial<RelayQuoteStep>);
        expect(() => adaptRelaySteps(eip191Step, params)).toThrow(ProviderGetQuoteFailure);
    });

    it("stores post data and step id in metadata", () => {
        const steps = adaptRelaySteps(makeSignatureStep(), params);
        expect(steps[0]!.metadata).toEqual({
            relayPostData: POST_DATA,
            relayStepId: "authorize1",
        });
    });

    it("filters out complete signature items", () => {
        const step = makeSignatureStep({
            items: [
                {
                    status: "complete",
                    data: {
                        sign: {
                            signatureKind: "eip712",
                            domain: EIP712_DOMAIN,
                            types: EIP712_TYPES,
                            value: EIP712_VALUE,
                            primaryType: "PermitTransferFrom",
                        },
                        post: POST_DATA,
                    },
                },
            ],
        } as Partial<RelayQuoteStep>);
        expect(adaptRelaySteps(step, params)).toHaveLength(0);
    });
});

// ── API Step Pattern Tests ──────────────────────────────
// Relay returns 4 step patterns depending on token type and usePermit:
//   Pattern 1: [deposit]                    — native ETH
//   Pattern 2: [approve, deposit]           — ERC-20, no permit
//   Pattern 3: [authorize1]                 — ERC-20, permit + token supports EIP-2612
//   Pattern 4: [approve, authorize1]        — ERC-20, permit + token lacks EIP-2612

describe("adaptQuote — deposit only (native ETH)", () => {
    it("maps single deposit step to one transaction", () => {
        const quote = adaptQuote(makeQuoteRequest(), makeRelayQuoteResponse(), PROVIDER_ID);

        expect(quote.order.steps).toHaveLength(1);
        expect(quote.order.steps[0]!.kind).toBe("transaction");
        expect(quote.order.checks).toBeUndefined();
    });
});

describe("adaptQuote — signature only (permit, EIP-2612 token)", () => {
    it("maps single signature step to one signature", () => {
        const response = makeRelayQuoteResponse({
            steps: [makeSignatureStep()],
        } as Partial<RelayQuoteResponse>);

        const quote = adaptQuote(makeQuoteRequest(), response, PROVIDER_ID);

        expect(quote.order.steps).toHaveLength(1);
        expect(quote.order.steps[0]!.kind).toBe("signature");
        expect(quote.order.checks).toBeUndefined();
    });

    it("extracts tracking.orderId from signature step requestId", () => {
        const response = makeRelayQuoteResponse({
            steps: [makeSignatureStep({ requestId: "0xsig-req-456" })],
        } as Partial<RelayQuoteResponse>);

        const quote = adaptQuote(makeQuoteRequest(), response, PROVIDER_ID);
        expect(quote.tracking).toEqual({ orderId: "0xsig-req-456" });
    });
});

describe("adaptQuote — exact-output amount cap", () => {
    const QUOTED_INPUT_AMOUNT = "1500000";

    const exactOutputRequest: QuoteRequest = {
        user: VALID_ADDRESS,
        input: { chainId: ORIGIN_CHAIN_ID, assetAddress: VALID_ADDRESS },
        output: {
            chainId: DESTINATION_CHAIN_ID,
            assetAddress: VALID_ADDRESS,
            amount: OUTPUT_AMOUNT,
        },
        swapType: "exact-output",
    };

    function responseWithEnvelopeAmount(envelopeAmount: string): RelayQuoteResponse {
        const base = makeRelayQuoteResponse();
        return {
            ...base,
            steps: [
                makeSignatureStep({
                    items: [
                        {
                            status: "incomplete",
                            data: {
                                sign: {
                                    signatureKind: "eip712",
                                    domain: EIP712_DOMAIN,
                                    types: EIP712_TYPES,
                                    value: {
                                        ...EIP712_VALUE,
                                        permitted: { token: VALID_ADDRESS, amount: envelopeAmount },
                                    },
                                    primaryType: "PermitTransferFrom",
                                },
                                post: POST_DATA,
                            },
                        },
                    ],
                } as Partial<RelayQuoteStep>),
            ],
            details: {
                ...base.details!,
                currencyIn: { ...base.details!.currencyIn!, amount: QUOTED_INPUT_AMOUNT },
            },
        };
    }

    it("rejects a signature envelope that inflates above the quoted input amount", () => {
        expect(() =>
            adaptQuote(exactOutputRequest, responseWithEnvelopeAmount("9999999999"), PROVIDER_ID),
        ).toThrowError(/amount/);
    });

    it("accepts a signature envelope matching the quoted input amount", () => {
        expect(() =>
            adaptQuote(
                exactOutputRequest,
                responseWithEnvelopeAmount(QUOTED_INPUT_AMOUNT),
                PROVIDER_ID,
            ),
        ).not.toThrow();
    });

    it("keeps the user's exact-input amount as the validation cap", () => {
        const exactInputResponse = responseWithEnvelopeAmount("2000000");
        exactInputResponse.details = {
            ...exactInputResponse.details!,
            currencyIn: { ...exactInputResponse.details!.currencyIn!, amount: "2000000" },
        };

        expect(() => adaptQuote(makeQuoteRequest(), exactInputResponse, PROVIDER_ID)).toThrowError(
            /amount/,
        );
    });
});

describe("adaptQuote — approve + signature (permit, non-EIP-2612 token)", () => {
    it("maps signature step and extracts approve as allowance check", () => {
        const approveCalldata = makeApproveCalldata(SPENDER_ADDRESS, 1000000n);
        const response = makeRelayQuoteResponse({
            steps: [
                {
                    id: "approve",
                    action: "Approve token",
                    description: "Approve USDC",
                    kind: "transaction",
                    items: [
                        {
                            status: "incomplete",
                            data: {
                                to: TOKEN_ADDRESS,
                                data: approveCalldata,
                                chainId: ORIGIN_CHAIN_ID,
                            },
                        },
                    ],
                },
                makeSignatureStep(),
            ],
        } as Partial<RelayQuoteResponse>);

        const quote = adaptQuote(makeQuoteRequest(), response, PROVIDER_ID);

        expect(quote.order.steps).toHaveLength(1);
        expect(quote.order.steps[0]!.kind).toBe("signature");
        expect(quote.order.checks?.allowances).toHaveLength(1);
    });
});
