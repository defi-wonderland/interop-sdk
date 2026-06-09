import { describe, expect, it } from "vitest";

import type { Quote } from "../../../../src/core/schemas/quote.js";
import { ProviderExecuteFailure } from "../../../../src/core/errors/ProviderExecuteFailure.exception.js";
import { adaptSubmitGaslessRequest } from "../../../../src/protocols/superbridge/adapters/submitGaslessRequestAdapter.js";

const ADDR = "0x1234567890abcdef1234567890abcdef12345678";

function preview(): Quote["preview"] {
    return {
        inputs: [{ chainId: 1, accountAddress: ADDR, assetAddress: ADDR, amount: "1000" }],
        outputs: [{ chainId: 8453, accountAddress: ADDR, assetAddress: ADDR, amount: "990" }],
    };
}

function gaslessQuote(): Quote {
    return {
        order: {
            steps: [
                {
                    kind: "signature",
                    chainId: 1,
                    signaturePayload: {
                        signatureType: "eip712",
                        domain: {},
                        primaryType: "Order",
                        types: {},
                        message: {},
                    },
                    metadata: {
                        superbridgeTypedData: "{}",
                        superbridgeRouteId: "r1",
                        superbridgeChainId: "1",
                    },
                },
            ],
        },
        preview: preview(),
        provider: "superbridge",
    };
}

describe("adaptSubmitGaslessRequest", () => {
    it("builds a request from the signature step metadata", () => {
        const request = adaptSubmitGaslessRequest(gaslessQuote(), "0xsignature");

        expect(request.typedData).toBe("{}");
        expect(request.signature).toBe("0xsignature");
        expect(request.id).toBe("r1");
    });

    it("throws when gasless metadata is missing", () => {
        const quote: Quote = {
            order: {
                steps: [{ kind: "transaction", chainId: 1, transaction: { to: ADDR, data: "0x" } }],
            },
            preview: preview(),
            provider: "superbridge",
        };

        expect(() => adaptSubmitGaslessRequest(quote, "0xsignature")).toThrow(
            ProviderExecuteFailure,
        );
    });
});
