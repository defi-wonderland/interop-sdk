import { describe, expect, it } from "vitest";

import type {
    BungeeAutoRoute,
    BungeeQuoteResponse,
} from "../../../../src/protocols/bungee/schemas.js";
import { adaptQuotes } from "../../../../src/protocols/bungee/adapters/quoteResponseAdapter.js";

const VALID_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";
const RECIPIENT_ADDRESS = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
const PROVIDER_ID = "bungee";

function buildAutoRoute(overrides: Record<string, unknown> = {}): BungeeAutoRoute {
    return {
        userOp: "sign",
        requestHash: "0xreqhash123",
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
        signTypedData: {
            domain: { name: "Permit2", chainId: 1 },
            types: {
                PermitWitnessTransferFrom: [{ name: "permitted", type: "TokenPermissions" }],
            },
            values: { witness: { field: "value" } },
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

describe("adaptQuotes", () => {
    it("creates SignatureStep for sign userOp", () => {
        const response = buildBungeeQuoteResponse();
        const [quote] = adaptQuotes(response as never, PROVIDER_ID);

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

        const [quote] = adaptQuotes(response as never, PROVIDER_ID);

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

        const quotes = adaptQuotes(response as never, PROVIDER_ID);

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

        const quotes = adaptQuotes(response as never, PROVIDER_ID);

        expect(quotes).toHaveLength(0);
    });

    it("maps preview inputs from response.result.input", () => {
        const response = buildBungeeQuoteResponse();
        const [quote] = adaptQuotes(response as never, PROVIDER_ID);

        expect(quote!.preview.inputs[0]!.amount).toBe("1000000");
        expect(quote!.preview.inputs[0]!.chainId).toBe(1);
        expect(quote!.preview.inputs[0]!.assetAddress).toBe(VALID_ADDRESS);
    });

    it("maps preview outputs from autoRoute.output", () => {
        const response = buildBungeeQuoteResponse();
        const [quote] = adaptQuotes(response as never, PROVIDER_ID);

        expect(quote!.preview.outputs[0]!.amount).toBe("999000");
        expect(quote!.preview.outputs[0]!.chainId).toBe(10);
    });

    it("uses input.amount for allowance required (not approvalData.amount)", () => {
        const response = buildBungeeQuoteResponse();
        const [quote] = adaptQuotes(response as never, PROVIDER_ID);

        const allowances = quote!.order.checks?.allowances;
        expect(allowances).toHaveLength(1);
        expect(allowances![0]!.required).toBe("1000000");
        expect(allowances![0]!.spender).toBe("0x2222222222222222222222222222222222222222");
    });

    it("sets tracking orderId from requestHash", () => {
        const response = buildBungeeQuoteResponse();
        const [quote] = adaptQuotes(response as never, PROVIDER_ID);

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

        const quotes = adaptQuotes(response as never, PROVIDER_ID);

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
        const [quote] = adaptQuotes(response as never, PROVIDER_ID);

        expect(quote!.partialFill).toBe(false);
        expect(quote!.failureHandling).toBe("refund-automatic");
    });

    it("propagates eta from the auto route's estimatedTime", () => {
        const response = buildBungeeQuoteResponse();
        const [quote] = adaptQuotes(response as never, PROVIDER_ID);

        expect(quote!.eta).toBe(30);
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

        const quotes = adaptQuotes(response as never, PROVIDER_ID);

        expect(quotes).toHaveLength(2);
    });

    it("returns empty array when no routes available", () => {
        const response = buildBungeeQuoteResponse();
        response.result.autoRoute = null as never;

        const quotes = adaptQuotes(response as never, PROVIDER_ID);

        expect(quotes).toHaveLength(0);
    });
});
