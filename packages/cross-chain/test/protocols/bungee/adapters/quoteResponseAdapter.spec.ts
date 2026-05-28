import { describe, expect, it } from "vitest";

import type { QuoteRequest } from "../../../../src/core/schemas/quoteRequest.js";
import type {
    BungeeAutoRoute,
    BungeeBuildTxResult,
    BungeeManualRoute,
    BungeeQuoteResponse,
} from "../../../../src/protocols/bungee/schemas.js";
import { PERMIT2_ADDRESS } from "../../../../src/core/constants/eip712.js";
import {
    adaptManualRouteQuote,
    adaptQuotes,
} from "../../../../src/protocols/bungee/adapters/quoteResponseAdapter.js";

const VALID_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";
const RECIPIENT_ADDRESS = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
const SPENDER_ADDRESS = "0x3a23F943181408EAC424116Af7b7790c94Cb97a5";
const BUNGEE_GATEWAY = "0xCDeA28EE7bd5bf7710b294d9391E1B6A318D809a";
const PROVIDER_ID = "bungee";
const ORIGIN_CHAIN_ID = 1;
const DESTINATION_CHAIN_ID = 10;
const INPUT_AMOUNT = "1000000";
const FUTURE_DEADLINE = Math.floor(Date.now() / 1000) + 3600;

function makeQuoteRequest(overrides?: Partial<QuoteRequest>): QuoteRequest {
    return {
        user: VALID_ADDRESS,
        input: {
            chainId: ORIGIN_CHAIN_ID,
            assetAddress: VALID_ADDRESS,
            amount: INPUT_AMOUNT,
        },
        output: {
            chainId: DESTINATION_CHAIN_ID,
            assetAddress: VALID_ADDRESS,
            recipient: RECIPIENT_ADDRESS,
        },
        ...overrides,
    };
}

function buildSignTypedData(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        domain: {
            name: "Permit2",
            chainId: ORIGIN_CHAIN_ID,
            verifyingContract: PERMIT2_ADDRESS,
        },
        types: {
            PermitWitnessTransferFrom: [
                { name: "permitted", type: "TokenPermissions" },
                { name: "spender", type: "address" },
                { name: "nonce", type: "uint256" },
                { name: "deadline", type: "uint256" },
                { name: "witness", type: "Request" },
            ],
            TokenPermissions: [
                { name: "token", type: "address" },
                { name: "amount", type: "uint256" },
            ],
            Request: [{ name: "basicReq", type: "BasicRequest" }],
            BasicRequest: [
                { name: "originChainId", type: "uint256" },
                { name: "destinationChainId", type: "uint256" },
                { name: "deadline", type: "uint256" },
                { name: "nonce", type: "uint256" },
                { name: "sender", type: "address" },
                { name: "receiver", type: "address" },
                { name: "delegate", type: "address" },
                { name: "bungeeGateway", type: "address" },
                { name: "switchboardId", type: "uint32" },
                { name: "inputToken", type: "address" },
                { name: "inputAmount", type: "uint256" },
                { name: "outputToken", type: "address" },
                { name: "minOutputAmount", type: "uint256" },
                { name: "refuelAmount", type: "uint256" },
            ],
        },
        values: {
            permitted: { token: VALID_ADDRESS, amount: INPUT_AMOUNT },
            spender: BUNGEE_GATEWAY,
            nonce: "1",
            deadline: FUTURE_DEADLINE,
            witness: {
                basicReq: {
                    originChainId: ORIGIN_CHAIN_ID,
                    destinationChainId: DESTINATION_CHAIN_ID,
                    deadline: FUTURE_DEADLINE,
                    nonce: "1",
                    sender: VALID_ADDRESS,
                    receiver: RECIPIENT_ADDRESS,
                    delegate: VALID_ADDRESS,
                    bungeeGateway: BUNGEE_GATEWAY,
                    switchboardId: 1,
                    inputToken: VALID_ADDRESS,
                    inputAmount: INPUT_AMOUNT,
                    outputToken: VALID_ADDRESS,
                    minOutputAmount: "0",
                    refuelAmount: "0",
                },
            },
        },
        ...overrides,
    };
}

function buildAutoRoute(overrides: Record<string, unknown> = {}): BungeeAutoRoute {
    return {
        userOp: "sign",
        requestHash: "0xreqhash123",
        output: {
            token: {
                chainId: DESTINATION_CHAIN_ID,
                address: VALID_ADDRESS,
                name: "USDC",
                symbol: "USDC",
                decimals: 6,
            },
            amount: "999000",
            priceInUsd: 1,
            valueInUsd: 999,
            minAmountOut: "998000",
            effectiveReceivedInUsd: 998,
        },
        requestType: "SINGLE_OUTPUT_REQUEST",
        approvalData: {
            spenderAddress: "0x2222222222222222222222222222222222222222",
            amount: "950000",
            tokenAddress: VALID_ADDRESS,
            userAddress: VALID_ADDRESS,
        },
        signTypedData: buildSignTypedData(),
        gasFee: {
            gasToken: {
                chainId: 1,
                address: "0x0000000000000000000000000000000000000000",
                name: "ETH",
                symbol: "ETH",
                decimals: 18,
            },
            gasLimit: "21000",
            gasPrice: "20000000000",
            estimatedFee: "420000000000000",
            feeInUsd: 0.5,
        },
        slippage: 0.5,
        estimatedTime: 30,
        routeDetails: {
            name: "across",
            logoURI: "https://example.com/logo.png",
        },
        quoteId: "quote-abc",
        quoteExpiry: 1700000000,
        routeTags: ["MAX_OUTPUT"],
        ...overrides,
    };
}

function buildBungeeQuoteResponse(overrides: Record<string, unknown> = {}): BungeeQuoteResponse {
    return {
        success: true,
        statusCode: 200,
        result: {
            originChainId: 1,
            destinationChainId: 10,
            userAddress: VALID_ADDRESS,
            receiverAddress: RECIPIENT_ADDRESS,
            input: {
                token: {
                    chainId: 1,
                    address: VALID_ADDRESS,
                    name: "ETH",
                    symbol: "ETH",
                    decimals: 18,
                },
                amount: "1000000",
                priceInUsd: 1800,
                valueInUsd: 1800,
            },
            autoRoute: buildAutoRoute(),
            manualRoutes: [],
        },
        ...overrides,
    };
}

function buildManualRoute(overrides: Record<string, unknown> = {}): BungeeManualRoute {
    return {
        quoteId: "manual-1",
        output: {
            token: {
                chainId: 10,
                address: VALID_ADDRESS,
                name: "USDC",
                symbol: "USDC",
                decimals: 6,
            },
            amount: "999000",
            priceInUsd: 1,
            valueInUsd: 0.999,
            minAmountOut: "998000",
            effectiveReceivedInUsd: 0.998,
        },
        gasFee: {
            gasToken: {
                chainId: 1,
                address: "0x0000000000000000000000000000000000000000",
                name: "ETH",
                symbol: "ETH",
                decimals: 18,
            },
            gasLimit: "21000",
            gasPrice: "20000000000",
            estimatedFee: "420000000000000",
            feeInUsd: 0.5,
        },
        slippage: 0.5,
        estimatedTime: 60,
        routeDetails: {
            name: "Across",
            logoURI: "https://example.com/across.png",
            routeFee: {
                token: {
                    chainId: 1,
                    address: VALID_ADDRESS,
                    name: "USDC",
                    symbol: "USDC",
                    decimals: 6,
                },
                amount: "1000",
                feeInUsd: 0.001,
                priceInUsd: 1,
            },
        },
        ...overrides,
    };
}

function buildBuildTxResult(overrides: Record<string, unknown> = {}): BungeeBuildTxResult {
    return {
        userOp: "tx",
        txData: {
            to: SPENDER_ADDRESS,
            data: "0xdeadbeef",
            value: "0",
            chainId: 1,
        },
        approvalData: {
            spenderAddress: SPENDER_ADDRESS,
            amount: "1000000",
            tokenAddress: VALID_ADDRESS,
            userAddress: VALID_ADDRESS,
        },
        ...overrides,
    };
}

function buildManualResponse(): BungeeQuoteResponse {
    return buildBungeeQuoteResponse({
        result: {
            originChainId: 1,
            destinationChainId: 10,
            userAddress: VALID_ADDRESS,
            receiverAddress: RECIPIENT_ADDRESS,
            input: {
                token: {
                    chainId: 1,
                    address: VALID_ADDRESS,
                    name: "USDC",
                    symbol: "USDC",
                    decimals: 6,
                },
                amount: "1000000",
                priceInUsd: 1,
                valueInUsd: 1,
            },
            autoRoute: null,
            manualRoutes: [buildManualRoute()],
        },
    });
}

describe("adaptQuotes", () => {
    it("creates SignatureStep for sign userOp", () => {
        const response = buildBungeeQuoteResponse();
        const [quote] = adaptQuotes(response as never, PROVIDER_ID, makeQuoteRequest());

        expect(quote!.order.steps[0]!.kind).toBe("signature");

        const step = quote!.order.steps[0]!;
        if (step.kind === "signature") {
            expect(step.signaturePayload.domain).toBeDefined();
            expect(step.signaturePayload.types).toBeDefined();
            expect(step.signaturePayload.message).toBeDefined();
        }
    });

    it("creates TransactionStep for tx userOp", () => {
        const response = buildBungeeQuoteResponse();
        response.result.autoRoute = buildAutoRoute({
            userOp: "tx",
            signTypedData: null,
            txData: {
                to: VALID_ADDRESS,
                data: "0xdeadbeef",
                value: "0",
                chainId: 1,
            },
        });

        const [quote] = adaptQuotes(response as never, PROVIDER_ID, makeQuoteRequest());

        expect(quote!.order.steps[0]!.kind).toBe("transaction");
    });

    it("filters out quotes when txData.data is not a string", () => {
        const response = buildBungeeQuoteResponse();
        response.result.autoRoute = buildAutoRoute({
            userOp: "tx",
            signTypedData: null,
            txData: {
                to: VALID_ADDRESS,
                data: { instructions: [], lookupTables: [], signers: [] },
                value: "0",
                chainId: 1,
            },
        });

        const quotes = adaptQuotes(response as never, PROVIDER_ID, makeQuoteRequest());

        expect(quotes).toHaveLength(0);
    });

    it("filters out quotes when txData fails schema validation", () => {
        const response = buildBungeeQuoteResponse();
        response.result.autoRoute = buildAutoRoute({
            userOp: "tx",
            signTypedData: null,
            txData: {
                to: VALID_ADDRESS,
                data: "0xdeadbeef",
            },
        });

        const quotes = adaptQuotes(response as never, PROVIDER_ID, makeQuoteRequest());

        expect(quotes).toHaveLength(0);
    });

    it("maps preview inputs from response.result.input", () => {
        const response = buildBungeeQuoteResponse();
        const [quote] = adaptQuotes(response as never, PROVIDER_ID, makeQuoteRequest());

        expect(quote!.preview.inputs[0]!.amount).toBe("1000000");
        expect(quote!.preview.inputs[0]!.chainId).toBe(1);
        expect(quote!.preview.inputs[0]!.assetAddress).toBe(VALID_ADDRESS);
    });

    it("maps preview outputs from autoRoute.output", () => {
        const response = buildBungeeQuoteResponse();
        const [quote] = adaptQuotes(response as never, PROVIDER_ID, makeQuoteRequest());

        expect(quote!.preview.outputs[0]!.amount).toBe("999000");
        expect(quote!.preview.outputs[0]!.chainId).toBe(10);
    });

    it("exposes minAmountOut as the slippage floor on preview output", () => {
        const response = buildBungeeQuoteResponse();
        const [quote] = adaptQuotes(response as never, PROVIDER_ID, makeQuoteRequest());
        if (!quote) throw new Error("expected a quote");

        expect(quote.preview.outputs[0]?.minAmount).toBe("998000");
    });

    it("prefers effectiveAmount over amount when provider exposes it", () => {
        const response = buildBungeeQuoteResponse();
        response.result.autoRoute = buildAutoRoute({
            output: {
                ...buildAutoRoute().output,
                effectiveAmount: "997500",
                effectiveValueInUsd: 997.5,
            },
        });

        const [quote] = adaptQuotes(response as never, PROVIDER_ID, makeQuoteRequest());
        if (!quote) throw new Error("expected a quote");

        expect(quote.preview.outputs[0]?.amount).toBe("997500");
        expect(quote.preview.outputs[0]?.amountUsd).toBe("997.5");
        expect(quote.preview.outputs[0]?.minAmount).toBe("998000");
    });

    it("maps valueInUsd to preview.amountUsd as decimal string", () => {
        const response = buildBungeeQuoteResponse();
        const [quote] = adaptQuotes(response as never, PROVIDER_ID, makeQuoteRequest());

        expect(quote!.preview.inputs[0]!.amountUsd).toBe("1800");
        expect(quote!.preview.outputs[0]!.amountUsd).toBe("999");
    });

    it("serializes fractional valueInUsd losslessly", () => {
        const response = buildBungeeQuoteResponse();
        response.result.input.valueInUsd = 1800.42;
        response.result.autoRoute = buildAutoRoute({
            output: { ...buildAutoRoute().output, valueInUsd: 4.9972825837 },
        });

        const [quote] = adaptQuotes(response as never, PROVIDER_ID, makeQuoteRequest());

        expect(quote!.preview.inputs[0]!.amountUsd).toBe("1800.42");
        expect(quote!.preview.outputs[0]!.amountUsd).toBe("4.9972825837");
    });

    it("uses input.amount for allowance required (not approvalData.amount)", () => {
        const response = buildBungeeQuoteResponse();
        const [quote] = adaptQuotes(response as never, PROVIDER_ID, makeQuoteRequest());

        const allowances = quote!.order.checks?.allowances;
        expect(allowances).toHaveLength(1);
        expect(allowances![0]!.required).toBe("1000000");
        expect(allowances![0]!.spender).toBe("0x2222222222222222222222222222222222222222");
    });

    it("sets tracking orderId from requestHash", () => {
        const response = buildBungeeQuoteResponse();
        const [quote] = adaptQuotes(response as never, PROVIDER_ID, makeQuoteRequest());

        expect(quote!.tracking?.orderId).toBe("0xreqhash123");
    });

    it("stores the specific autoRoute matching each quote in metadata", () => {
        const response = buildBungeeQuoteResponse();
        (response.result as Record<string, unknown>).autoRoutes = [
            buildAutoRoute({
                quoteId: "route-B",
                output: { ...buildAutoRoute().output, amount: "1500000" },
            }),
        ];

        const quotes = adaptQuotes(response as never, PROVIDER_ID, makeQuoteRequest());

        // Preserves Bungee order: autoRoute first, then autoRoutes[]
        expect(quotes[0]!.quoteId).toBe("quote-abc");
        expect((quotes[0]!.metadata?.bungeeAutoRoute as Record<string, unknown>).quoteId).toBe(
            "quote-abc",
        );

        expect(quotes[1]!.quoteId).toBe("route-B");
        expect((quotes[1]!.metadata?.bungeeAutoRoute as Record<string, unknown>).quoteId).toBe(
            "route-B",
        );
    });

    it("sets partialFill and failureHandling", () => {
        const response = buildBungeeQuoteResponse();
        const [quote] = adaptQuotes(response as never, PROVIDER_ID, makeQuoteRequest());

        expect(quote!.partialFill).toBe(false);
        expect(quote!.failureHandling).toBe("refund-automatic");
    });

    it("deduplicates autoRoute and autoRoutes by quoteId", () => {
        const response = buildBungeeQuoteResponse();
        (response.result as Record<string, unknown>).autoRoutes = [
            buildAutoRoute({ quoteId: "quote-abc" }), // same as autoRoute
            buildAutoRoute({
                quoteId: "quote-xyz",
                output: { ...buildAutoRoute().output, amount: "998000" },
            }),
        ];

        const quotes = adaptQuotes(response as never, PROVIDER_ID, makeQuoteRequest());

        expect(quotes).toHaveLength(2);
    });

    it("returns empty array when no routes available", () => {
        const response = buildBungeeQuoteResponse();
        response.result.autoRoute = null as never;

        const quotes = adaptQuotes(response as never, PROVIDER_ID, makeQuoteRequest());

        expect(quotes).toHaveLength(0);
    });
});

describe("adaptManualRouteQuote", () => {
    it("creates a TransactionStep from buildTx.txData", () => {
        const quote = adaptManualRouteQuote(
            buildManualResponse(),
            buildManualRoute(),
            buildBuildTxResult(),
            PROVIDER_ID,
        );

        expect(quote).not.toBeNull();
        expect(quote!.order.steps).toHaveLength(1);
        expect(quote!.order.steps[0]!.kind).toBe("transaction");
    });

    it("returns null when txData is invalid", () => {
        const quote = adaptManualRouteQuote(
            buildManualResponse(),
            buildManualRoute(),
            buildBuildTxResult({
                txData: { data: "0xdeadbeef", value: "0", chainId: 1 }, // missing `to`
            }),
            PROVIDER_ID,
        );

        expect(quote).toBeNull();
    });

    it("uses the bridge name from routeDetails in the step description", () => {
        const quote = adaptManualRouteQuote(
            buildManualResponse(),
            buildManualRoute({ routeDetails: { name: "Stargate", logoURI: "" } }),
            buildBuildTxResult(),
            PROVIDER_ID,
        );

        const step = quote!.order.steps[0]!;
        expect(step.description).toBe("Submit transaction via Stargate");
    });

    it("derives allowances from buildTx.approvalData with input.amount as required", () => {
        const quote = adaptManualRouteQuote(
            buildManualResponse(),
            buildManualRoute(),
            buildBuildTxResult(),
            PROVIDER_ID,
        );

        const allowances = quote!.order.checks?.allowances;
        expect(allowances).toHaveLength(1);
        expect(allowances![0]!.spender).toBe(SPENDER_ADDRESS);
        expect(allowances![0]!.required).toBe("1000000");
    });

    it("falls back to manualRoute.approvalData when buildTx.approvalData is absent", () => {
        const route = buildManualRoute({
            approvalData: {
                spenderAddress: SPENDER_ADDRESS,
                amount: "1000000",
                tokenAddress: VALID_ADDRESS,
                userAddress: VALID_ADDRESS,
            },
        });
        const buildTx = buildBuildTxResult({ approvalData: undefined });

        const quote = adaptManualRouteQuote(buildManualResponse(), route, buildTx, PROVIDER_ID);

        expect(quote!.order.checks?.allowances).toHaveLength(1);
    });

    it("omits allowances when no approval is needed", () => {
        const route = buildManualRoute({ approvalData: undefined });
        const buildTx = buildBuildTxResult({ approvalData: undefined });

        const quote = adaptManualRouteQuote(buildManualResponse(), route, buildTx, PROVIDER_ID);

        expect(quote!.order.checks).toBeUndefined();
    });

    it("does not set tracking — manual routes are tracked by on-chain txHash", () => {
        const quote = adaptManualRouteQuote(
            buildManualResponse(),
            buildManualRoute(),
            buildBuildTxResult(),
            PROVIDER_ID,
        );

        expect(quote!.tracking).toBeUndefined();
    });

    it("propagates quoteId, eta, fees and provider", () => {
        const quote = adaptManualRouteQuote(
            buildManualResponse(),
            buildManualRoute(),
            buildBuildTxResult(),
            PROVIDER_ID,
        );

        expect(quote!.quoteId).toBe("manual-1");
        expect(quote!.eta).toBe(60);
        expect(quote!.provider).toBe(PROVIDER_ID);
        expect(quote!.fees?.originGas).toBeDefined();
        expect(quote!.fees?.bridgeFee).toBeDefined();
    });

    it("stores the manual route and buildTx in metadata for traceability", () => {
        const quote = adaptManualRouteQuote(
            buildManualResponse(),
            buildManualRoute(),
            buildBuildTxResult(),
            PROVIDER_ID,
        );

        expect(quote!.metadata?.bungeeManualRoute).toBeDefined();
        expect(quote!.metadata?.bungeeBuildTx).toBeDefined();
        expect(quote!.metadata?.bungeeResponse).toBeDefined();
    });
});
