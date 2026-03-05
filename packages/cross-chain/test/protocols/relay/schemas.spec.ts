import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

import {
    RelayBadRequestResponseSchema,
    RelayIntentStatusResponseSchema,
    RelayQuoteResponseSchema,
    RelayRateLimitedResponseSchema,
    RelayServerErrorResponseSchema,
    RelayUnauthorizedResponseSchema,
} from "../../../src/protocols/relay/schemas.js";

const VALID_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";
const ORIGIN_CHAIN_ID = 1;
const DESTINATION_CHAIN_ID = 10;
const REQUEST_ID = "0xabc123";
const ORDER_ID = "0xorder456";
const TX_DATA = "0xdeadbeef";
const INPUT_AMOUNT = "1000000";
const OUTPUT_AMOUNT = "999000";
const GAS_FEE_AMOUNT = "100000";
const GAS_FEE_USD = "0.10";
const RELAYER_FEE_AMOUNT = "50000";
const RELAYER_FEE_USD = "0.05";
const TIME_ESTIMATE_SECONDS = 30;
const USDC_DECIMALS = 6;
const SAMPLE_IN_TX_HASH = "0xabc";
const SAMPLE_OUT_TX_HASH = "0xdef";
const SAMPLE_UPDATED_AT = 1700000000000;
const SAMPLE_RATE = "0.999";
const SAMPLE_SLIPPAGE_USD = "0.50";
const SAMPLE_SLIPPAGE_VALUE = "500";
const SAMPLE_SLIPPAGE_PERCENT = "0.5";
const SAMPLE_PRICE_IMPACT_USD = "-0.01";
const SAMPLE_PRICE_IMPACT_PERCENT = "-0.001";
const SAMPLE_SIMULATED_BLOCK = 19000000;
const SAMPLE_ERROR_CODE = "INSUFFICIENT_BALANCE";
const SAMPLE_ERROR_MESSAGE = "Insufficient balance for this transaction";

const USDC_CURRENCY = {
    chainId: DESTINATION_CHAIN_ID,
    address: VALID_ADDRESS,
    symbol: "USDC",
    name: "USD Coin",
    decimals: USDC_DECIMALS,
};

const validQuoteResponse = {
    steps: [
        {
            id: "deposit",
            action: "Confirm transaction in your wallet",
            description: "Deposit funds for executing the bridge",
            kind: "transaction",
            requestId: REQUEST_ID,
            items: [
                {
                    status: "incomplete",
                    data: {
                        from: VALID_ADDRESS,
                        to: VALID_ADDRESS,
                        data: TX_DATA,
                        value: INPUT_AMOUNT,
                        chainId: ORIGIN_CHAIN_ID,
                    },
                    check: {
                        endpoint: `/intents/status?requestId=${REQUEST_ID}`,
                        method: "GET",
                    },
                },
            ],
        },
    ],
    fees: {
        gas: { amount: GAS_FEE_AMOUNT, amountUsd: GAS_FEE_USD },
        relayer: { amount: RELAYER_FEE_AMOUNT, amountUsd: RELAYER_FEE_USD },
    },
    details: {
        operation: "bridge",
        timeEstimate: TIME_ESTIMATE_SECONDS,
        currencyOut: {
            currency: USDC_CURRENCY,
            amount: OUTPUT_AMOUNT,
        },
    },
};

describe("RelayQuoteResponseSchema", () => {
    it("should accept a valid quote response", () => {
        const result = RelayQuoteResponseSchema.parse(validQuoteResponse);
        expect(result.steps).toHaveLength(1);
        expect(result.steps[0]!.requestId).toBe(REQUEST_ID);
    });

    it("should accept a minimal response with only steps", () => {
        const minimalRequestId = "0x123";
        const minimal = {
            steps: [
                {
                    id: "deposit",
                    action: "Confirm",
                    description: "Bridge",
                    kind: "transaction",
                    requestId: minimalRequestId,
                    items: [
                        {
                            status: "incomplete",
                            data: {
                                to: VALID_ADDRESS,
                                data: "0x00",
                                chainId: ORIGIN_CHAIN_ID,
                            },
                        },
                    ],
                },
            ],
        };
        const result = RelayQuoteResponseSchema.parse(minimal);
        expect(result.steps).toHaveLength(1);
    });

    it("should accept a full response with protocol, expanded details, and all fees", () => {
        const fullResponse = {
            ...validQuoteResponse,
            fees: {
                gas: { amount: GAS_FEE_AMOUNT, amountUsd: GAS_FEE_USD },
                relayer: { amount: RELAYER_FEE_AMOUNT, amountUsd: RELAYER_FEE_USD },
                relayerGas: { amount: GAS_FEE_AMOUNT },
                relayerService: { amount: RELAYER_FEE_AMOUNT },
                app: { amount: "0" },
                subsidized: { amount: "0" },
            },
            details: {
                ...validQuoteResponse.details,
                sender: VALID_ADDRESS,
                recipient: VALID_ADDRESS,
                currencyIn: { currency: USDC_CURRENCY, amount: INPUT_AMOUNT },
                currencyOut: { currency: USDC_CURRENCY, amount: OUTPUT_AMOUNT },
                refundCurrency: { currency: USDC_CURRENCY, amount: INPUT_AMOUNT },
                currencyGasTopup: { currency: USDC_CURRENCY, amount: GAS_FEE_AMOUNT },
                rate: SAMPLE_RATE,
                totalImpact: { usd: SAMPLE_PRICE_IMPACT_USD, percent: SAMPLE_PRICE_IMPACT_PERCENT },
                swapImpact: { usd: SAMPLE_PRICE_IMPACT_USD, percent: SAMPLE_PRICE_IMPACT_PERCENT },
                expandedPriceImpact: {
                    swap: { usd: SAMPLE_PRICE_IMPACT_USD },
                    execution: { usd: SAMPLE_PRICE_IMPACT_USD },
                    relay: { usd: SAMPLE_PRICE_IMPACT_USD },
                    app: { usd: "0" },
                    sponsored: { usd: "0" },
                },
                slippageTolerance: {
                    origin: {
                        usd: SAMPLE_SLIPPAGE_USD,
                        value: SAMPLE_SLIPPAGE_VALUE,
                        percent: SAMPLE_SLIPPAGE_PERCENT,
                    },
                    destination: {
                        usd: SAMPLE_SLIPPAGE_USD,
                        value: SAMPLE_SLIPPAGE_VALUE,
                        percent: SAMPLE_SLIPPAGE_PERCENT,
                    },
                },
                userBalance: INPUT_AMOUNT,
                fallbackType: "canonical",
                isFixedRate: true,
                route: {
                    origin: {
                        inputCurrency: { currency: USDC_CURRENCY, amount: INPUT_AMOUNT },
                        outputCurrency: { currency: USDC_CURRENCY, amount: INPUT_AMOUNT },
                        router: "uniswap",
                        includedSwapSources: ["uniswap-v3"],
                    },
                    destination: {
                        inputCurrency: { currency: USDC_CURRENCY, amount: OUTPUT_AMOUNT },
                        outputCurrency: { currency: USDC_CURRENCY, amount: OUTPUT_AMOUNT },
                    },
                },
            },
            protocol: {
                v2: {
                    orderId: ORDER_ID,
                    orderData: { some: "data" },
                    paymentDetails: {
                        chainId: ORIGIN_CHAIN_ID,
                        depository: VALID_ADDRESS,
                        currency: VALID_ADDRESS,
                        amount: INPUT_AMOUNT,
                    },
                },
            },
        };

        const result = RelayQuoteResponseSchema.parse(fullResponse);

        expect(result.details?.expandedPriceImpact?.swap?.usd).toBe(SAMPLE_PRICE_IMPACT_USD);
        expect(result.details?.slippageTolerance?.origin?.percent).toBe(SAMPLE_SLIPPAGE_PERCENT);
        expect(result.details?.route?.origin?.router).toBe("uniswap");
        expect(result.details?.refundCurrency?.amount).toBe(INPUT_AMOUNT);
        expect(result.details?.fallbackType).toBe("canonical");
        expect(result.protocol?.v2?.orderId).toBe(ORDER_ID);
    });

    it("should accept a step with depositAddress", () => {
        const depositAddress = "0xdeposit1234567890abcdef1234567890abcdef";
        const response = {
            steps: [
                {
                    ...validQuoteResponse.steps[0],
                    depositAddress,
                },
            ],
        };
        const result = RelayQuoteResponseSchema.parse(response);
        expect(result.steps[0]!.depositAddress).toBe(depositAddress);
    });

    it("should reject a response with empty steps", () => {
        const invalid = { ...validQuoteResponse, steps: [] };
        expect(() => RelayQuoteResponseSchema.parse(invalid)).toThrow(ZodError);
    });

    it("should reject an invalid address format in step item data", () => {
        const invalidAddress = "not-an-address";
        const invalid = {
            ...validQuoteResponse,
            steps: [
                {
                    ...validQuoteResponse.steps[0],
                    items: [
                        {
                            status: "incomplete",
                            data: {
                                to: invalidAddress,
                                data: "0x00",
                                chainId: ORIGIN_CHAIN_ID,
                            },
                        },
                    ],
                },
            ],
        };
        expect(() => RelayQuoteResponseSchema.parse(invalid)).toThrow(ZodError);
    });

    it("should reject a step with missing requestId", () => {
        const { requestId: _, ...stepWithoutId } = validQuoteResponse.steps[0]!;
        const invalid = { ...validQuoteResponse, steps: [stepWithoutId] };
        expect(() => RelayQuoteResponseSchema.parse(invalid)).toThrow(ZodError);
    });

    it("should accept a step with kind 'signature'", () => {
        const signatureStep = {
            ...validQuoteResponse.steps[0],
            kind: "signature",
        };
        const response = { steps: [signatureStep] };
        const result = RelayQuoteResponseSchema.parse(response);
        expect(result.steps[0]!.kind).toBe("signature");
    });

    it("should accept a step item with status 'complete'", () => {
        const response = {
            steps: [
                {
                    ...validQuoteResponse.steps[0],
                    items: [
                        {
                            status: "complete",
                            data: {
                                to: VALID_ADDRESS,
                                data: TX_DATA,
                                chainId: ORIGIN_CHAIN_ID,
                            },
                        },
                    ],
                },
            ],
        };
        const result = RelayQuoteResponseSchema.parse(response);
        expect(result.steps[0]!.items[0]!.status).toBe("complete");
    });

    it("should accept a currency with metadata", () => {
        const logoURI = "https://example.com/usdc.png";
        const response = {
            ...validQuoteResponse,
            details: {
                ...validQuoteResponse.details,
                currencyOut: {
                    currency: {
                        ...USDC_CURRENCY,
                        metadata: {
                            logoURI,
                            verified: true,
                            isNative: false,
                        },
                    },
                    amount: OUTPUT_AMOUNT,
                },
            },
        };
        const result = RelayQuoteResponseSchema.parse(response);
        expect(result.details?.currencyOut?.currency.metadata?.logoURI).toBe(logoURI);
        expect(result.details?.currencyOut?.currency.metadata?.verified).toBe(true);
    });

    it("should strip unknown fields from response", () => {
        const response = {
            ...validQuoteResponse,
            unknownTopLevel: "stripped",
        };
        const result = RelayQuoteResponseSchema.parse(response);
        expect(result).not.toHaveProperty("unknownTopLevel");
    });

    it("should reject a step with empty items array", () => {
        const response = {
            steps: [
                {
                    ...validQuoteResponse.steps[0],
                    items: [],
                },
            ],
        };
        expect(() => RelayQuoteResponseSchema.parse(response)).toThrow(ZodError);
    });

    it("should reject an invalid step kind", () => {
        const response = {
            steps: [
                {
                    ...validQuoteResponse.steps[0],
                    kind: "unknown-kind",
                },
            ],
        };
        expect(() => RelayQuoteResponseSchema.parse(response)).toThrow(ZodError);
    });

    it("should reject an invalid step item status", () => {
        const response = {
            steps: [
                {
                    ...validQuoteResponse.steps[0],
                    items: [
                        {
                            status: "unknown-status",
                            data: {
                                to: VALID_ADDRESS,
                                data: TX_DATA,
                                chainId: ORIGIN_CHAIN_ID,
                            },
                        },
                    ],
                },
            ],
        };
        expect(() => RelayQuoteResponseSchema.parse(response)).toThrow(ZodError);
    });
});

describe("RelayIntentStatusResponseSchema", () => {
    it.each([
        "waiting",
        "pending",
        "submitted",
        "success",
        "delayed",
        "refunded",
        "failure",
        "refund",
    ] as const)("should accept status '%s'", (status) => {
        const result = RelayIntentStatusResponseSchema.parse({ status });
        expect(result.status).toBe(status);
    });

    it("should accept a full status response with all fields", () => {
        const result = RelayIntentStatusResponseSchema.parse({
            status: "success",
            details: "Transfer complete",
            inTxHashes: [SAMPLE_IN_TX_HASH],
            txHashes: [SAMPLE_OUT_TX_HASH],
            updatedAt: SAMPLE_UPDATED_AT,
            originChainId: ORIGIN_CHAIN_ID,
            destinationChainId: DESTINATION_CHAIN_ID,
        });
        expect(result.status).toBe("success");
        expect(result.inTxHashes).toEqual([SAMPLE_IN_TX_HASH]);
        expect(result.txHashes).toEqual([SAMPLE_OUT_TX_HASH]);
    });

    it("should reject an invalid status value", () => {
        expect(() => RelayIntentStatusResponseSchema.parse({ status: "invalid" })).toThrow(
            ZodError,
        );
    });
});

describe("RelayBadRequestResponseSchema", () => {
    it("should accept a minimal bad request response", () => {
        const result = RelayBadRequestResponseSchema.parse({
            message: SAMPLE_ERROR_MESSAGE,
            errorCode: SAMPLE_ERROR_CODE,
        });
        expect(result.message).toBe(SAMPLE_ERROR_MESSAGE);
        expect(result.errorCode).toBe(SAMPLE_ERROR_CODE);
    });

    it("should accept a full bad request response with failedCallData", () => {
        const result = RelayBadRequestResponseSchema.parse({
            message: SAMPLE_ERROR_MESSAGE,
            errorCode: SAMPLE_ERROR_CODE,
            errorData: "additional error context",
            requestId: REQUEST_ID,
            approxSimulatedBlock: SAMPLE_SIMULATED_BLOCK,
            failedCallData: {
                from: VALID_ADDRESS,
                to: VALID_ADDRESS,
                data: TX_DATA,
                value: INPUT_AMOUNT,
            },
        });
        expect(result.failedCallData?.to).toBe(VALID_ADDRESS);
        expect(result.approxSimulatedBlock).toBe(SAMPLE_SIMULATED_BLOCK);
    });

    it("should reject a response without required fields", () => {
        expect(() =>
            RelayBadRequestResponseSchema.parse({ message: SAMPLE_ERROR_MESSAGE }),
        ).toThrow(ZodError);
    });
});

describe("RelayUnauthorizedResponseSchema", () => {
    it("should accept a valid unauthorized response", () => {
        const result = RelayUnauthorizedResponseSchema.parse({
            message: "Unauthorized",
            errorCode: "UNAUTHORIZED",
        });
        expect(result.message).toBe("Unauthorized");
    });

    it("should reject a response without errorCode", () => {
        expect(() => RelayUnauthorizedResponseSchema.parse({ message: "Unauthorized" })).toThrow(
            ZodError,
        );
    });
});

describe("RelayRateLimitedResponseSchema", () => {
    it("should accept a valid rate limited response", () => {
        const result = RelayRateLimitedResponseSchema.parse({
            message: "Rate limit exceeded",
        });
        expect(result.message).toBe("Rate limit exceeded");
    });

    it("should reject a response without message", () => {
        expect(() => RelayRateLimitedResponseSchema.parse({})).toThrow(ZodError);
    });
});

describe("RelayServerErrorResponseSchema", () => {
    it("should accept a minimal server error response", () => {
        const result = RelayServerErrorResponseSchema.parse({
            message: "Internal server error",
            errorCode: "INTERNAL_ERROR",
        });
        expect(result.message).toBe("Internal server error");
    });

    it("should accept a server error response with requestId", () => {
        const result = RelayServerErrorResponseSchema.parse({
            message: "Internal server error",
            errorCode: "INTERNAL_ERROR",
            requestId: REQUEST_ID,
        });
        expect(result.requestId).toBe(REQUEST_ID);
    });

    it("should reject a response without errorCode", () => {
        expect(() =>
            RelayServerErrorResponseSchema.parse({ message: "Internal server error" }),
        ).toThrow(ZodError);
    });
});
