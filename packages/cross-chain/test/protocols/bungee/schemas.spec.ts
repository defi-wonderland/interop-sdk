import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

import {
    BungeeApprovalDataSchema,
    BungeeAutoRouteSchema,
    BungeeBuildTxRequestSchema,
    BungeeBuildTxResponseSchema,
    BungeeBuildTxResultSchema,
    BungeeDestinationDataSchema,
    BungeeGasFeeSchema,
    BungeeInputSchema,
    BungeeManualRouteSchema,
    BungeeOriginDataSchema,
    BungeeOutputSchema,
    BungeeQuoteRequestSchema,
    BungeeQuoteResponseSchema,
    BungeeQuoteResultSchema,
    BungeeRefuelSchema,
    BungeeRouteDetailsSchema,
    BungeeRouteFeeSchema,
    BungeeSignTypedDataSchema,
    BungeeStatusRequestSchema,
    BungeeStatusResponseSchema,
    BungeeStatusResultSchema,
    BungeeSubmitRequestSchema,
    BungeeSubmitResponseSchema,
    BungeeTokenExtSchema,
    BungeeTokenListResponseSchema,
    BungeeTokenSchema,
    BungeeTxDataSchema,
} from "../../../src/protocols/bungee/schemas.js";

const VALID_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";

// ── Common builders ────────────────────────────────────

function buildToken(overrides = {}): Record<string, unknown> {
    return {
        chainId: 1,
        address: VALID_ADDRESS,
        name: "ETH",
        symbol: "ETH",
        decimals: 18,
        ...overrides,
    };
}

function buildInput(overrides = {}): Record<string, unknown> {
    return {
        token: buildToken(),
        amount: "1000000",
        priceInUsd: 1800.5,
        valueInUsd: 1800.5,
        ...overrides,
    };
}

function buildOutput(overrides = {}): Record<string, unknown> {
    return {
        token: buildToken(),
        amount: "999000",
        priceInUsd: 1,
        valueInUsd: 999,
        minAmountOut: "998000",
        effectiveReceivedInUsd: 998,
        effectiveAmount: "999000",
        effectiveValueInUsd: 999,
        ...overrides,
    };
}

function buildApprovalData(overrides = {}): Record<string, unknown> {
    return {
        spenderAddress: VALID_ADDRESS,
        amount: "1000000",
        tokenAddress: VALID_ADDRESS,
        userAddress: VALID_ADDRESS,
        ...overrides,
    };
}

function buildGasFee(overrides = {}): Record<string, unknown> {
    return {
        gasToken: buildToken(),
        gasLimit: "21000",
        gasPrice: "20000000000",
        estimatedFee: "420000000000000",
        feeInUsd: 0.5,
        ...overrides,
    };
}

function buildRouteFee(overrides = {}): Record<string, unknown> {
    return {
        token: buildToken(),
        amount: "100000",
        feeInUsd: 0.1,
        priceInUsd: 1800,
        ...overrides,
    };
}

function buildRouteDetails(overrides = {}): Record<string, unknown> {
    return {
        name: "across",
        logoURI: "https://example.com/logo.png",
        ...overrides,
    };
}

function buildTxData(overrides = {}): Record<string, unknown> {
    return {
        data: "0xdeadbeef",
        value: "0",
        chainId: 1,
        ...overrides,
    };
}

function buildSignTypedData(overrides = {}): Record<string, unknown> {
    return {
        domain: { name: "Permit2" },
        types: { EIP712Domain: [] },
        values: { witness: {} },
        ...overrides,
    };
}

function buildRefuel(overrides = {}): Record<string, unknown> {
    return {
        output: { token: buildToken(), amount: "1000" },
        ...overrides,
    };
}

// ── Common schema tests ────────────────────────────────

describe("BungeeTokenSchema", () => {
    it("accepts a valid token", () => {
        const result = BungeeTokenSchema.parse(buildToken());
        expect(result.symbol).toBe("ETH");
    });

    it("rejects when required field is missing", () => {
        const { address, ...rest } = buildToken();
        expect(() => BungeeTokenSchema.parse(rest)).toThrow(ZodError);
    });
});

describe("BungeeInputSchema", () => {
    it("accepts a valid input", () => {
        const result = BungeeInputSchema.parse(buildInput());
        expect(result.amount).toBe("1000000");
    });

    it("rejects when required field is missing", () => {
        const { token, ...rest } = buildInput();
        expect(() => BungeeInputSchema.parse(rest)).toThrow(ZodError);
    });
});

describe("BungeeOutputSchema", () => {
    it("accepts a valid output", () => {
        const result = BungeeOutputSchema.parse(buildOutput());
        expect(result.minAmountOut).toBe("998000");
    });

    it("rejects when required field is missing", () => {
        const { minAmountOut, ...rest } = buildOutput();
        expect(() => BungeeOutputSchema.parse(rest)).toThrow(ZodError);
    });
});

describe("BungeeApprovalDataSchema", () => {
    it("accepts valid approval data", () => {
        const result = BungeeApprovalDataSchema.parse(buildApprovalData());
        expect(result.spenderAddress).toBe(VALID_ADDRESS);
    });

    it("rejects when required field is missing", () => {
        const { spenderAddress, ...rest } = buildApprovalData();
        expect(() => BungeeApprovalDataSchema.parse(rest)).toThrow(ZodError);
    });
});

describe("BungeeGasFeeSchema", () => {
    it("accepts a valid gas fee", () => {
        const result = BungeeGasFeeSchema.parse(buildGasFee());
        expect(result.feeInUsd).toBe(0.5);
    });

    it("rejects when required field is missing", () => {
        const { gasToken, ...rest } = buildGasFee();
        expect(() => BungeeGasFeeSchema.parse(rest)).toThrow(ZodError);
    });
});

describe("BungeeRouteFeeSchema", () => {
    it("accepts a valid route fee", () => {
        const result = BungeeRouteFeeSchema.parse(buildRouteFee());
        expect(result.feeInUsd).toBe(0.1);
    });

    it("rejects when required field is missing", () => {
        const { token, ...rest } = buildRouteFee();
        expect(() => BungeeRouteFeeSchema.parse(rest)).toThrow(ZodError);
    });
});

describe("BungeeRouteDetailsSchema", () => {
    it("accepts valid route details", () => {
        const result = BungeeRouteDetailsSchema.parse(buildRouteDetails());
        expect(result.name).toBe("across");
    });

    it("rejects when required field is missing", () => {
        const { name, ...rest } = buildRouteDetails();
        expect(() => BungeeRouteDetailsSchema.parse(rest)).toThrow(ZodError);
    });

    it("accepts route details with optional routeFee", () => {
        const result = BungeeRouteDetailsSchema.parse(
            buildRouteDetails({ routeFee: buildRouteFee() }),
        );
        expect(result.routeFee).toBeDefined();
    });

    it("accepts route details with null routeFee", () => {
        const result = BungeeRouteDetailsSchema.parse(buildRouteDetails({ routeFee: null }));
        expect(result.routeFee).toBeNull();
    });

    it("accepts route details with optional dexDetails", () => {
        const dexDetails = {
            protocol: {
                name: "uniswap",
                displayName: "Uniswap",
                icon: "https://example.com/uni.png",
            },
            minAmountOut: "998000",
            outputTokenAddress: VALID_ADDRESS,
            inputTokenAddress: VALID_ADDRESS,
            amountOut: "999000",
            slippage: 0.5,
        };
        const result = BungeeRouteDetailsSchema.parse(buildRouteDetails({ dexDetails }));
        expect(result.dexDetails).toBeDefined();
    });
});

describe("BungeeTxDataSchema", () => {
    it("accepts valid tx data", () => {
        const result = BungeeTxDataSchema.parse(buildTxData());
        expect(result.chainId).toBe(1);
    });

    it("rejects when required field is missing", () => {
        const { data, ...rest } = buildTxData();
        expect(() => BungeeTxDataSchema.parse(rest)).toThrow(ZodError);
    });

    it("accepts data as a record object", () => {
        const result = BungeeTxDataSchema.parse(buildTxData({ data: { method: "swap" } }));
        expect(result.data).toEqual({ method: "swap" });
    });
});

describe("BungeeSignTypedDataSchema", () => {
    it("accepts valid sign typed data", () => {
        const result = BungeeSignTypedDataSchema.parse(buildSignTypedData());
        expect(result.domain).toEqual({ name: "Permit2" });
    });

    it("rejects when required field is missing", () => {
        const { domain, ...rest } = buildSignTypedData();
        expect(() => BungeeSignTypedDataSchema.parse(rest)).toThrow(ZodError);
    });
});

describe("BungeeRefuelSchema", () => {
    it("accepts a valid refuel", () => {
        const result = BungeeRefuelSchema.parse(buildRefuel());
        expect(result.output.amount).toBe("1000");
    });

    it("rejects when output is missing", () => {
        const { output, ...rest } = buildRefuel();
        expect(() => BungeeRefuelSchema.parse(rest)).toThrow(ZodError);
    });

    it("accepts refuel with optional input", () => {
        const result = BungeeRefuelSchema.parse(
            buildRefuel({ input: { token: buildToken(), amount: "500" } }),
        );
        expect(result.input?.amount).toBe("500");
    });

    it("accepts refuel with null input", () => {
        const result = BungeeRefuelSchema.parse(buildRefuel({ input: null }));
        expect(result.input).toBeNull();
    });
});

// ── Quote schema tests ─────────────────────────────────

function buildQuoteRequest(overrides = {}): Record<string, unknown> {
    return {
        originChainId: "1",
        destinationChainId: "10",
        inputToken: VALID_ADDRESS,
        inputAmount: "1000000",
        receiverAddress: VALID_ADDRESS,
        outputToken: VALID_ADDRESS,
        ...overrides,
    };
}

function buildAutoRoute(overrides = {}): Record<string, unknown> {
    return {
        userOp: "sign",
        requestHash: "0xhash",
        output: buildOutput(),
        requestType: "SINGLE_OUTPUT_REQUEST",
        slippage: 0.5,
        estimatedTime: 30,
        routeDetails: buildRouteDetails(),
        quoteId: "q1",
        quoteExpiry: 1700000000,
        routeTags: ["MAX_OUTPUT"],
        ...overrides,
    };
}

function buildManualRoute(overrides = {}): Record<string, unknown> {
    return {
        quoteId: "m1",
        output: buildOutput(),
        gasFee: buildGasFee(),
        slippage: 0.5,
        estimatedTime: 60,
        routeDetails: buildRouteDetails(),
        ...overrides,
    };
}

function buildQuoteResult(overrides = {}): Record<string, unknown> {
    return {
        originChainId: 1,
        destinationChainId: 10,
        userAddress: VALID_ADDRESS,
        receiverAddress: VALID_ADDRESS,
        input: buildInput(),
        manualRoutes: [],
        ...overrides,
    };
}

function buildQuoteResponse(overrides = {}): Record<string, unknown> {
    return {
        success: true,
        statusCode: 200,
        result: buildQuoteResult(),
        ...overrides,
    };
}

describe("BungeeQuoteRequestSchema", () => {
    it("accepts a valid quote request", () => {
        const result = BungeeQuoteRequestSchema.parse(buildQuoteRequest());
        expect(result.originChainId).toBe("1");
    });

    it("rejects when required field is missing", () => {
        const { originChainId, ...rest } = buildQuoteRequest();
        expect(() => BungeeQuoteRequestSchema.parse(rest)).toThrow(ZodError);
    });
});

describe("BungeeAutoRouteSchema", () => {
    it("accepts a valid auto route", () => {
        const result = BungeeAutoRouteSchema.parse(buildAutoRoute());
        expect(result.quoteId).toBe("q1");
    });

    it("rejects when required field is missing", () => {
        const { userOp, ...rest } = buildAutoRoute();
        expect(() => BungeeAutoRouteSchema.parse(rest)).toThrow(ZodError);
    });

    it("accepts auto route with optional approvalData", () => {
        const result = BungeeAutoRouteSchema.parse(
            buildAutoRoute({
                approvalData: {
                    spenderAddress: VALID_ADDRESS,
                    amount: "1000000",
                    tokenAddress: VALID_ADDRESS,
                    userAddress: VALID_ADDRESS,
                },
            }),
        );
        expect(result.approvalData).toBeDefined();
    });

    it("accepts auto route with null approvalData", () => {
        const result = BungeeAutoRouteSchema.parse(buildAutoRoute({ approvalData: null }));
        expect(result.approvalData).toBeNull();
    });
});

describe("BungeeManualRouteSchema", () => {
    it("accepts a valid manual route", () => {
        const result = BungeeManualRouteSchema.parse(buildManualRoute());
        expect(result.quoteId).toBe("m1");
    });

    it("rejects when required field is missing", () => {
        const { gasFee, ...rest } = buildManualRoute();
        expect(() => BungeeManualRouteSchema.parse(rest)).toThrow(ZodError);
    });
});

describe("BungeeQuoteResultSchema", () => {
    it("accepts a valid quote result", () => {
        const result = BungeeQuoteResultSchema.parse(buildQuoteResult());
        expect(result.originChainId).toBe(1);
    });

    it("accepts when manualRoutes is missing (optional field)", () => {
        const { manualRoutes, ...rest } = buildQuoteResult();
        const result = BungeeQuoteResultSchema.parse(rest);
        expect(result.manualRoutes).toBeUndefined();
    });

    it("rejects when required field is missing", () => {
        const { input, ...rest } = buildQuoteResult();
        expect(() => BungeeQuoteResultSchema.parse(rest)).toThrow(ZodError);
    });

    it("accepts quote result with autoRoute", () => {
        const result = BungeeQuoteResultSchema.parse(
            buildQuoteResult({ autoRoute: buildAutoRoute() }),
        );
        expect(result.autoRoute).toBeDefined();
    });

    it("accepts quote result with autoRoutes array", () => {
        const result = BungeeQuoteResultSchema.parse(
            buildQuoteResult({ autoRoutes: [buildAutoRoute()] }),
        );
        expect(result.autoRoutes).toHaveLength(1);
    });
});

describe("BungeeQuoteResponseSchema", () => {
    it("accepts a valid quote response", () => {
        const result = BungeeQuoteResponseSchema.parse(buildQuoteResponse());
        expect(result.success).toBe(true);
    });

    it("rejects when required field is missing", () => {
        const { success, ...rest } = buildQuoteResponse();
        expect(() => BungeeQuoteResponseSchema.parse(rest)).toThrow(ZodError);
    });

    it("accepts quote response with optional message", () => {
        const result = BungeeQuoteResponseSchema.parse(buildQuoteResponse({ message: "ok" }));
        expect(result.message).toBe("ok");
    });
});

// ── Build-tx schema tests ──────────────────────────────

function buildBuildTxResult(overrides = {}): Record<string, unknown> {
    return {
        userOp: "tx",
        txData: { ...buildTxData(), to: VALID_ADDRESS },
        ...overrides,
    };
}

function buildBuildTxResponse(overrides = {}): Record<string, unknown> {
    return {
        success: true,
        statusCode: 200,
        result: buildBuildTxResult(),
        ...overrides,
    };
}

describe("BungeeBuildTxRequestSchema", () => {
    it("accepts a valid build-tx request", () => {
        const result = BungeeBuildTxRequestSchema.parse({ quoteId: "m1" });
        expect(result.quoteId).toBe("m1");
    });

    it("rejects when quoteId is missing", () => {
        expect(() => BungeeBuildTxRequestSchema.parse({})).toThrow(ZodError);
    });
});

describe("BungeeBuildTxResultSchema", () => {
    it("accepts a valid result without approvalData", () => {
        const result = BungeeBuildTxResultSchema.parse(buildBuildTxResult());
        expect(result.userOp).toBe("tx");
        expect(result.approvalData).toBeUndefined();
    });

    it("accepts a valid result with approvalData", () => {
        const result = BungeeBuildTxResultSchema.parse(
            buildBuildTxResult({ approvalData: buildApprovalData() }),
        );
        expect(result.approvalData).toBeDefined();
    });

    it("accepts a valid result with null approvalData", () => {
        const result = BungeeBuildTxResultSchema.parse(buildBuildTxResult({ approvalData: null }));
        expect(result.approvalData).toBeNull();
    });

    it("rejects when txData is missing", () => {
        const { txData, ...rest } = buildBuildTxResult();
        expect(() => BungeeBuildTxResultSchema.parse(rest)).toThrow(ZodError);
    });
});

describe("BungeeBuildTxResponseSchema", () => {
    it("accepts a valid response", () => {
        const result = BungeeBuildTxResponseSchema.parse(buildBuildTxResponse());
        expect(result.success).toBe(true);
    });

    it("rejects when success is missing", () => {
        const { success, ...rest } = buildBuildTxResponse();
        expect(() => BungeeBuildTxResponseSchema.parse(rest)).toThrow(ZodError);
    });
});

// ── Submit schema tests ────────────────────────────────

function buildSubmitRequest(overrides = {}): Record<string, unknown> {
    return {
        request: { field: "value" },
        userSignature: "0xsig",
        requestType: "SINGLE_OUTPUT_REQUEST",
        quoteId: "q1",
        ...overrides,
    };
}

function buildSubmitResponse(overrides = {}): Record<string, unknown> {
    return {
        success: true,
        statusCode: 200,
        result: { hash: "0xhash" },
        ...overrides,
    };
}

describe("BungeeSubmitRequestSchema", () => {
    it("accepts a valid submit request", () => {
        const result = BungeeSubmitRequestSchema.parse(buildSubmitRequest());
        expect(result.quoteId).toBe("q1");
    });

    it("rejects when required field is missing", () => {
        const { request, ...rest } = buildSubmitRequest();
        expect(() => BungeeSubmitRequestSchema.parse(rest)).toThrow(ZodError);
    });

    it("rejects invalid requestType value", () => {
        expect(() =>
            BungeeSubmitRequestSchema.parse(buildSubmitRequest({ requestType: "INVALID" })),
        ).toThrow(ZodError);
    });
});

describe("BungeeSubmitResponseSchema", () => {
    it("accepts a valid submit response with object result", () => {
        const result = BungeeSubmitResponseSchema.parse(buildSubmitResponse());
        expect(result.success).toBe(true);
    });

    it("accepts a valid submit response with array result", () => {
        const result = BungeeSubmitResponseSchema.parse(
            buildSubmitResponse({
                result: [{ hash: "0xhash1" }, { hash: "0xhash2" }],
            }),
        );
        expect(Array.isArray(result.result)).toBe(true);
    });

    it("rejects when required field is missing", () => {
        const { success, ...rest } = buildSubmitResponse();
        expect(() => BungeeSubmitResponseSchema.parse(rest)).toThrow(ZodError);
    });

    it("accepts submit response with requestHash instead of hash", () => {
        const result = BungeeSubmitResponseSchema.parse(
            buildSubmitResponse({ result: { requestHash: "0xreqhash" } }),
        );
        const entry = Array.isArray(result.result) ? result.result[0] : result.result;
        expect(entry?.requestHash).toBe("0xreqhash");
    });

    it("accepts submit response with extra fields via passthrough", () => {
        const result = BungeeSubmitResponseSchema.parse(
            buildSubmitResponse({
                result: { hash: "0xhash", originData: { status: "PENDING" } },
            }),
        );
        const entry = Array.isArray(result.result) ? result.result[0] : result.result;
        expect(entry?.hash).toBe("0xhash");
    });

    it("accepts submit response with optional message", () => {
        const result = BungeeSubmitResponseSchema.parse(
            buildSubmitResponse({ message: "submitted" }),
        );
        expect(result.message).toBe("submitted");
    });
});

// ── Status schema tests ────────────────────────────────

function buildStatusRequest(overrides = {}): Record<string, unknown> {
    return {
        requestHash: "0xhash",
        ...overrides,
    };
}

function buildOriginData(overrides = {}): Record<string, unknown> {
    return {
        input: [
            {
                token: buildToken(),
                amount: "1000000",
                priceInUsd: 1,
                valueInUsd: 1,
            },
        ],
        originChainId: 1,
        txHash: "0xtx",
        status: "PENDING",
        userAddress: VALID_ADDRESS,
        ...overrides,
    };
}

function buildDestinationData(overrides = {}): Record<string, unknown> {
    return {
        output: [
            {
                token: buildToken(),
                amount: "999000",
                priceInUsd: 1,
                valueInUsd: 0.999,
                minAmountOut: "998000",
            },
        ],
        txHash: null,
        destinationChainId: 10,
        receiverAddress: VALID_ADDRESS,
        status: "PENDING",
        ...overrides,
    };
}

function buildStatusResult(overrides = {}): Record<string, unknown> {
    return {
        hash: "0xhash",
        originData: buildOriginData(),
        destinationData: buildDestinationData(),
        routeDetails: { name: "across", logoURI: "https://example.com" },
        bungeeStatusCode: 0,
        ...overrides,
    };
}

function buildStatusResponse(overrides = {}): Record<string, unknown> {
    return {
        success: true,
        statusCode: 200,
        result: [buildStatusResult()],
        ...overrides,
    };
}

describe("BungeeStatusRequestSchema", () => {
    it("accepts a status request with requestHash", () => {
        const result = BungeeStatusRequestSchema.parse(buildStatusRequest());
        expect(result.requestHash).toBe("0xhash");
    });

    it("accepts a status request with txHash", () => {
        const result = BungeeStatusRequestSchema.parse({ txHash: "0xtx" });
        expect(result.txHash).toBe("0xtx");
    });

    it("accepts a status request with both fields", () => {
        const result = BungeeStatusRequestSchema.parse({
            requestHash: "0xhash",
            txHash: "0xtx",
        });
        expect(result.requestHash).toBe("0xhash");
        expect(result.txHash).toBe("0xtx");
    });
});

describe("BungeeOriginDataSchema", () => {
    it("accepts valid origin data", () => {
        const result = BungeeOriginDataSchema.parse(buildOriginData());
        expect(result.status).toBe("PENDING");
    });

    it("rejects when required field is missing", () => {
        const { input, ...rest } = buildOriginData();
        expect(() => BungeeOriginDataSchema.parse(rest)).toThrow(ZodError);
    });

    it("accepts origin data with null txHash", () => {
        const result = BungeeOriginDataSchema.parse(buildOriginData({ txHash: null }));
        expect(result.txHash).toBeNull();
    });
});

describe("BungeeDestinationDataSchema", () => {
    it("accepts valid destination data", () => {
        const result = BungeeDestinationDataSchema.parse(buildDestinationData());
        expect(result.destinationChainId).toBe(10);
    });

    it("rejects when required field is missing", () => {
        const { output, ...rest } = buildDestinationData();
        expect(() => BungeeDestinationDataSchema.parse(rest)).toThrow(ZodError);
    });

    it("accepts destination data with null output", () => {
        const result = BungeeDestinationDataSchema.parse(buildDestinationData({ output: null }));
        expect(result.output).toBeNull();
    });
});

describe("BungeeStatusResultSchema", () => {
    it("accepts a valid status result", () => {
        const result = BungeeStatusResultSchema.parse(buildStatusResult());
        expect(result.hash).toBe("0xhash");
    });

    it("rejects when required field is missing", () => {
        const { hash, ...rest } = buildStatusResult();
        expect(() => BungeeStatusResultSchema.parse(rest)).toThrow(ZodError);
    });

    it("accepts status result with optional refund", () => {
        const result = BungeeStatusResultSchema.parse(
            buildStatusResult({
                refund: { chainId: 1, txHash: "0xrefund" },
            }),
        );
        expect(result.refund).toBeDefined();
    });

    it("accepts status result with null refund", () => {
        const result = BungeeStatusResultSchema.parse(buildStatusResult({ refund: null }));
        expect(result.refund).toBeNull();
    });
});

describe("BungeeStatusResponseSchema", () => {
    it("accepts a valid status response", () => {
        const result = BungeeStatusResponseSchema.parse(buildStatusResponse());
        expect(result.success).toBe(true);
    });

    it("rejects when required field is missing", () => {
        const { success, ...rest } = buildStatusResponse();
        expect(() => BungeeStatusResponseSchema.parse(rest)).toThrow(ZodError);
    });

    it("accepts status response with optional message", () => {
        const result = BungeeStatusResponseSchema.parse(buildStatusResponse({ message: "ok" }));
        expect(result.message).toBe("ok");
    });
});

// ── Token list schema tests ────────────────────────────

function buildTokenExt(overrides = {}): Record<string, unknown> {
    return {
        chainId: 1,
        address: VALID_ADDRESS,
        name: "USD Coin",
        symbol: "USDC",
        decimals: 6,
        ...overrides,
    };
}

function buildTokenListResponse(overrides = {}): Record<string, unknown> {
    return {
        success: true,
        statusCode: 200,
        result: {
            "1": [buildTokenExt()],
        },
        ...overrides,
    };
}

describe("BungeeTokenExtSchema", () => {
    it("accepts a valid token ext", () => {
        const result = BungeeTokenExtSchema.parse(buildTokenExt());
        expect(result.symbol).toBe("USDC");
    });

    it("rejects when required field is missing", () => {
        const { address, ...rest } = buildTokenExt();
        expect(() => BungeeTokenExtSchema.parse(rest)).toThrow(ZodError);
    });

    it("accepts optional logoURI and isVerified", () => {
        const result = BungeeTokenExtSchema.parse(
            buildTokenExt({ logoURI: "https://example.com/logo.png", isVerified: true }),
        );
        expect(result.logoURI).toBe("https://example.com/logo.png");
        expect(result.isVerified).toBe(true);
    });
});

describe("BungeeTokenListResponseSchema", () => {
    it("accepts a valid token list response", () => {
        const result = BungeeTokenListResponseSchema.parse(buildTokenListResponse());
        expect(result.success).toBe(true);
        expect(Object.keys(result.result)).toHaveLength(1);
    });

    it("rejects when required field is missing", () => {
        const { success, ...rest } = buildTokenListResponse();
        expect(() => BungeeTokenListResponseSchema.parse(rest)).toThrow(ZodError);
    });

    it("accepts response with empty tokens map", () => {
        const result = BungeeTokenListResponseSchema.parse(buildTokenListResponse({ result: {} }));
        expect(Object.keys(result.result)).toHaveLength(0);
    });

    it("accepts response with multiple chains", () => {
        const result = BungeeTokenListResponseSchema.parse(
            buildTokenListResponse({
                result: {
                    "1": [buildTokenExt()],
                    "42161": [buildTokenExt({ chainId: 42161 })],
                },
            }),
        );
        expect(Object.keys(result.result)).toHaveLength(2);
    });
});
