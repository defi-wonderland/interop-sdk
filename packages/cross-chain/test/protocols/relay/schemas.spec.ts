import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

import {
    RelayBadRequestResponseSchema,
    RelayIndexTransactionRequestSchema,
    RelayIndexTransactionResponseSchema,
    RelayIntentStatusRequestSchema,
    RelayIntentStatusResponseSchema,
    RelayQuoteRequestSchema,
    RelayQuoteResponseSchema,
    RelayRateLimitedResponseSchema,
    RelayServerErrorResponseSchema,
    RelayUnauthorizedResponseSchema,
} from "../../../src/protocols/relay/schemas.js";

// ── Constants ────────────────────────────────────────────

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
const SAMPLE_LOGO_URI = "https://example.com/usdc.png";
const SAMPLE_ROUTER = "uniswap";
const SAMPLE_SWAP_SOURCE = "uniswap-v3";
const SAMPLE_FALLBACK_TYPE = "canonical";
const SAMPLE_ERROR_DATA = "additional error context";
const SAMPLE_STATUS_DETAILS = "Transfer complete";
const ZERO_AMOUNT = "0";
const PAYMENT_CHAIN_ID = "1";

// ── Helpers ──────────────────────────────────────────────

function buildCurrency(overrides?: Record<string, unknown>): Record<string, unknown> {
    return {
        chainId: DESTINATION_CHAIN_ID,
        address: VALID_ADDRESS,
        symbol: "USDC",
        name: "USD Coin",
        decimals: USDC_DECIMALS,
        metadata: {
            logoURI: SAMPLE_LOGO_URI,
            verified: true,
            isNative: false,
        },
        ...overrides,
    };
}

function buildCurrencyAmount(
    amount: string,
    overrides?: Record<string, unknown>,
): Record<string, unknown> {
    return {
        currency: buildCurrency(),
        amount,
        amountFormatted: amount,
        amountUsd: amount,
        minimumAmount: amount,
        ...overrides,
    };
}

function buildStepItem(overrides?: Record<string, unknown>): Record<string, unknown> {
    return {
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
        ...overrides,
    };
}

function buildStep(overrides?: Record<string, unknown>): Record<string, unknown> {
    return {
        id: "deposit",
        action: "Confirm transaction in your wallet",
        description: "Deposit funds for executing the bridge",
        kind: "transaction",
        requestId: REQUEST_ID,
        items: [buildStepItem()],
        ...overrides,
    };
}

function buildFee(amount: string, amountUsd: string): Record<string, unknown> {
    return {
        currency: buildCurrency(),
        amount,
        amountFormatted: amount,
        amountUsd,
        minimumAmount: amount,
    };
}

function buildDetails(overrides?: Record<string, unknown>): Record<string, unknown> {
    return {
        operation: "bridge",
        sender: VALID_ADDRESS,
        recipient: VALID_ADDRESS,
        currencyIn: buildCurrencyAmount(INPUT_AMOUNT),
        currencyOut: buildCurrencyAmount(OUTPUT_AMOUNT),
        timeEstimate: TIME_ESTIMATE_SECONDS,
        rate: SAMPLE_RATE,
        totalImpact: { usd: SAMPLE_PRICE_IMPACT_USD, percent: SAMPLE_PRICE_IMPACT_PERCENT },
        swapImpact: { usd: SAMPLE_PRICE_IMPACT_USD, percent: SAMPLE_PRICE_IMPACT_PERCENT },
        expandedPriceImpact: {
            swap: { usd: SAMPLE_PRICE_IMPACT_USD },
            execution: { usd: SAMPLE_PRICE_IMPACT_USD },
            relay: { usd: SAMPLE_PRICE_IMPACT_USD },
            app: { usd: ZERO_AMOUNT },
            sponsored: { usd: ZERO_AMOUNT },
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
        isFixedRate: false,
        route: {
            origin: {
                inputCurrency: buildCurrencyAmount(INPUT_AMOUNT),
                outputCurrency: buildCurrencyAmount(INPUT_AMOUNT),
                router: SAMPLE_ROUTER,
                includedSwapSources: [SAMPLE_SWAP_SOURCE],
            },
            destination: {
                inputCurrency: buildCurrencyAmount(OUTPUT_AMOUNT),
                outputCurrency: buildCurrencyAmount(OUTPUT_AMOUNT),
                router: SAMPLE_ROUTER,
                includedSwapSources: [SAMPLE_SWAP_SOURCE],
            },
        },
        ...overrides,
    };
}

function buildProtocol(overrides?: Record<string, unknown>): Record<string, unknown> {
    return {
        v2: {
            orderId: ORDER_ID,
            paymentDetails: {
                chainId: PAYMENT_CHAIN_ID,
                depository: VALID_ADDRESS,
                currency: VALID_ADDRESS,
                amount: INPUT_AMOUNT,
            },
            ...overrides,
        },
    };
}

function buildQuoteResponse(overrides?: Record<string, unknown>): Record<string, unknown> {
    return {
        steps: [buildStep()],
        fees: {
            gas: buildFee(GAS_FEE_AMOUNT, GAS_FEE_USD),
            relayer: buildFee(RELAYER_FEE_AMOUNT, RELAYER_FEE_USD),
        },
        details: buildDetails(),
        protocol: buildProtocol(),
        ...overrides,
    };
}

// ── Index Transaction Tests ──────────────────────────────

describe("RelayIndexTransactionRequestSchema", () => {
    it("accepts a valid request with chainId and txHash", () => {
        const result = RelayIndexTransactionRequestSchema.parse({
            chainId: "1",
            txHash: SAMPLE_IN_TX_HASH,
        });
        expect(result.chainId).toBe("1");
        expect(result.txHash).toBe(SAMPLE_IN_TX_HASH);
    });

    it("accepts a request with optional requestId", () => {
        const result = RelayIndexTransactionRequestSchema.parse({
            chainId: "1",
            txHash: SAMPLE_IN_TX_HASH,
            requestId: REQUEST_ID,
        });
        expect(result.requestId).toBe(REQUEST_ID);
    });

    it("rejects a request missing txHash", () => {
        expect(() => RelayIndexTransactionRequestSchema.parse({ chainId: "1" })).toThrow(ZodError);
    });

    it("rejects a request missing chainId", () => {
        expect(() =>
            RelayIndexTransactionRequestSchema.parse({ txHash: SAMPLE_IN_TX_HASH }),
        ).toThrow(ZodError);
    });
});

describe("RelayIndexTransactionResponseSchema", () => {
    it("accepts a valid response with message", () => {
        const result = RelayIndexTransactionResponseSchema.parse({
            message: "Transaction indexed",
        });
        expect(result.message).toBe("Transaction indexed");
    });

    it("rejects a response without message", () => {
        expect(() => RelayIndexTransactionResponseSchema.parse({})).toThrow(ZodError);
    });
});

// ── Quote Request Tests ──────────────────────────────────

describe("RelayQuoteRequestSchema", () => {
    const VALID_REQUEST = {
        user: VALID_ADDRESS,
        originChainId: ORIGIN_CHAIN_ID,
        destinationChainId: DESTINATION_CHAIN_ID,
        originCurrency: VALID_ADDRESS,
        destinationCurrency: VALID_ADDRESS,
        amount: INPUT_AMOUNT,
        tradeType: "EXACT_INPUT" as const,
    };

    it("accepts a minimal valid request", () => {
        const result = RelayQuoteRequestSchema.parse(VALID_REQUEST);
        expect(result.user).toBe(VALID_ADDRESS);
        expect(result.tradeType).toBe("EXACT_INPUT");
    });

    it("accepts a request with all optional fields", () => {
        const result = RelayQuoteRequestSchema.parse({
            ...VALID_REQUEST,
            recipient: VALID_ADDRESS,
            slippageTolerance: "50",
            appFees: [{ recipient: VALID_ADDRESS, fee: "100" }],
            txs: [{ to: VALID_ADDRESS, value: "0", data: "0x" }],
            usePermit: false,
            topupGas: true,
            topupGasAmount: "2000000",
            referrer: "my-app",
            subsidizeFees: false,
        });
        expect(result.recipient).toBe(VALID_ADDRESS);
        expect(result.slippageTolerance).toBe("50");
        expect(result.appFees).toHaveLength(1);
    });

    it("rejects an invalid tradeType", () => {
        expect(() =>
            RelayQuoteRequestSchema.parse({ ...VALID_REQUEST, tradeType: "INVALID" }),
        ).toThrow(ZodError);
    });

    it("rejects a non-numeric amount", () => {
        expect(() => RelayQuoteRequestSchema.parse({ ...VALID_REQUEST, amount: "abc" })).toThrow(
            ZodError,
        );
    });

    it("rejects a request missing required fields", () => {
        const { user: _, ...noUser } = VALID_REQUEST;
        expect(() => RelayQuoteRequestSchema.parse(noUser)).toThrow(ZodError);
    });
});

// ── Intent Status Request Tests ─────────────────────────

describe("RelayIntentStatusRequestSchema", () => {
    it("accepts a request with requestId", () => {
        const result = RelayIntentStatusRequestSchema.parse({ requestId: REQUEST_ID });
        expect(result.requestId).toBe(REQUEST_ID);
    });
});

// ── Quote Response Tests ─────────────────────────────────

describe("RelayQuoteResponseSchema", () => {
    it("accepts a valid quote response", () => {
        const result = RelayQuoteResponseSchema.parse(buildQuoteResponse());
        expect(result.steps).toHaveLength(1);
        expect(result.steps[0]!.requestId).toBe(REQUEST_ID);
    });

    it("accepts a full response with all optional fields", () => {
        const response = buildQuoteResponse({
            fees: {
                gas: buildFee(GAS_FEE_AMOUNT, GAS_FEE_USD),
                relayer: buildFee(RELAYER_FEE_AMOUNT, RELAYER_FEE_USD),
                relayerGas: buildFee(GAS_FEE_AMOUNT, GAS_FEE_USD),
                relayerService: buildFee(RELAYER_FEE_AMOUNT, RELAYER_FEE_USD),
                app: buildFee(ZERO_AMOUNT, ZERO_AMOUNT),
                subsidized: buildFee(ZERO_AMOUNT, ZERO_AMOUNT),
            },
            details: buildDetails({
                refundCurrency: buildCurrencyAmount(INPUT_AMOUNT),
                currencyGasTopup: buildCurrencyAmount(GAS_FEE_AMOUNT),
                fallbackType: SAMPLE_FALLBACK_TYPE,
                isFixedRate: true,
                fixedRateFee: { usd: SAMPLE_PRICE_IMPACT_USD },
            }),
            protocol: buildProtocol({ orderData: { some: "data" } }),
        });

        const result = RelayQuoteResponseSchema.parse(response);

        expect(result.details?.expandedPriceImpact?.swap?.usd).toBe(SAMPLE_PRICE_IMPACT_USD);
        expect(result.details?.slippageTolerance?.origin?.percent).toBe(SAMPLE_SLIPPAGE_PERCENT);
        expect(result.details?.route?.origin?.router).toBe(SAMPLE_ROUTER);
        expect(result.details?.refundCurrency?.amount).toBe(INPUT_AMOUNT);
        expect(result.details?.fallbackType).toBe(SAMPLE_FALLBACK_TYPE);
        expect(result.protocol?.v2?.orderId).toBe(ORDER_ID);
    });

    it("rejects a response with empty steps", () => {
        expect(() => RelayQuoteResponseSchema.parse(buildQuoteResponse({ steps: [] }))).toThrow(
            ZodError,
        );
    });

    it("accepts a response without fees", () => {
        const { fees: _, ...noFees } = buildQuoteResponse();
        const result = RelayQuoteResponseSchema.parse(noFees);
        expect(result.fees).toBeUndefined();
    });

    it("accepts a response without details", () => {
        const { details: _, ...noDetails } = buildQuoteResponse();
        const result = RelayQuoteResponseSchema.parse(noDetails);
        expect(result.details).toBeUndefined();
    });

    it("accepts a response without protocol (same-chain swaps)", () => {
        const { protocol: _, ...noProtocol } = buildQuoteResponse();
        const result = RelayQuoteResponseSchema.parse(noProtocol);
        expect(result.protocol).toBeUndefined();
    });

    it("rejects an invalid address format in step item data", () => {
        const response = buildQuoteResponse({
            steps: [
                buildStep({
                    items: [
                        buildStepItem({
                            data: { to: "not-an-address", data: TX_DATA, chainId: ORIGIN_CHAIN_ID },
                        }),
                    ],
                }),
            ],
        });
        expect(() => RelayQuoteResponseSchema.parse(response)).toThrow(ZodError);
    });

    it("accepts a step without requestId", () => {
        const step = buildStep();
        const { requestId: _, ...stepWithoutId } = step;
        const result = RelayQuoteResponseSchema.parse(
            buildQuoteResponse({ steps: [stepWithoutId] }),
        );
        expect(result.steps[0]!.requestId).toBeUndefined();
    });

    it("accepts a step with kind 'signature'", () => {
        const response = buildQuoteResponse({
            steps: [buildStep({ kind: "signature" })],
        });
        const result = RelayQuoteResponseSchema.parse(response);
        expect(result.steps[0]!.kind).toBe("signature");
    });

    it("rejects a step with empty items array", () => {
        expect(() =>
            RelayQuoteResponseSchema.parse(
                buildQuoteResponse({ steps: [buildStep({ items: [] })] }),
            ),
        ).toThrow(ZodError);
    });
});

// ── Intent Status Tests ──────────────────────────────────

describe("RelayIntentStatusResponseSchema", () => {
    it.each(["waiting", "pending", "submitted", "success", "failure", "refund"] as const)(
        "accepts status '%s'",
        (status) => {
            const result = RelayIntentStatusResponseSchema.parse({ status });
            expect(result.status).toBe(status);
        },
    );

    it("accepts a full status response with all fields", () => {
        const result = RelayIntentStatusResponseSchema.parse({
            status: "success",
            details: SAMPLE_STATUS_DETAILS,
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

    it("rejects an invalid status value", () => {
        expect(() => RelayIntentStatusResponseSchema.parse({ status: "invalid" })).toThrow(
            ZodError,
        );
    });
});

// ── Error Response Tests ─────────────────────────────────

describe("RelayBadRequestResponseSchema", () => {
    it("accepts a minimal bad request response", () => {
        const result = RelayBadRequestResponseSchema.parse({
            message: SAMPLE_ERROR_MESSAGE,
            errorCode: SAMPLE_ERROR_CODE,
        });
        expect(result.message).toBe(SAMPLE_ERROR_MESSAGE);
        expect(result.errorCode).toBe(SAMPLE_ERROR_CODE);
    });

    it("accepts a full bad request response with failedCallData", () => {
        const result = RelayBadRequestResponseSchema.parse({
            message: SAMPLE_ERROR_MESSAGE,
            errorCode: SAMPLE_ERROR_CODE,
            errorData: SAMPLE_ERROR_DATA,
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

    it("rejects a response without errorCode", () => {
        expect(() =>
            RelayBadRequestResponseSchema.parse({ message: SAMPLE_ERROR_MESSAGE }),
        ).toThrow(ZodError);
    });
});

describe("RelayUnauthorizedResponseSchema", () => {
    it("accepts a valid unauthorized response", () => {
        const result = RelayUnauthorizedResponseSchema.parse({
            message: SAMPLE_ERROR_MESSAGE,
            errorCode: SAMPLE_ERROR_CODE,
        });
        expect(result.message).toBe(SAMPLE_ERROR_MESSAGE);
    });
});

describe("RelayRateLimitedResponseSchema", () => {
    it("accepts a valid rate limited response", () => {
        const result = RelayRateLimitedResponseSchema.parse({
            message: SAMPLE_ERROR_MESSAGE,
        });
        expect(result.message).toBe(SAMPLE_ERROR_MESSAGE);
    });
});

describe("RelayServerErrorResponseSchema", () => {
    it("accepts a server error response with requestId", () => {
        const result = RelayServerErrorResponseSchema.parse({
            message: SAMPLE_ERROR_MESSAGE,
            errorCode: SAMPLE_ERROR_CODE,
            requestId: REQUEST_ID,
        });
        expect(result.requestId).toBe(REQUEST_ID);
    });
});
