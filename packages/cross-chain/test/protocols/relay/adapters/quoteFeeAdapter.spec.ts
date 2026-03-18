import { describe, expect, it } from "vitest";

import type { RelayQuoteResponse } from "../../../../src/protocols/relay/schemas.js";
import { adaptFees } from "../../../../src/protocols/relay/adapters/quoteFeeAdapter.js";

const TOKEN_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const NATIVE_ADDRESS = "0x0000000000000000000000000000000000000000";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function makeFeeEntry(overrides?: Record<string, unknown>) {
    return {
        currency: {
            chainId: 1,
            address: TOKEN_ADDRESS,
            symbol: "USDC",
            name: "USD Coin",
            decimals: 6,
        },
        amount: "5000",
        amountUsd: "0.005",
        ...overrides,
    };
}

function makeResponse(fees: RelayQuoteResponse["fees"]): RelayQuoteResponse {
    return { steps: [], fees } as unknown as RelayQuoteResponse;
}

describe("adaptFees", () => {
    it("returns undefined when fees is undefined", () => {
        expect(adaptFees(makeResponse(undefined))).toBeUndefined();
    });

    it("returns undefined when both relayer and gas are absent", () => {
        expect(adaptFees(makeResponse({}))).toBeUndefined();
    });

    it("maps relayer fee to bridgeFee", () => {
        const result = adaptFees(makeResponse({ relayer: makeFeeEntry() }));

        expect(result).toEqual({
            bridgeFee: {
                amount: "5000",
                amountUsd: "0.005",
                token: { symbol: "USDC", decimals: 6, address: TOKEN_ADDRESS },
            },
            originGas: undefined,
        });
    });

    it("maps gas fee to originGas", () => {
        const gasFee = makeFeeEntry({
            currency: {
                chainId: 1,
                address: NATIVE_ADDRESS,
                symbol: "ETH",
                name: "Ether",
                decimals: 18,
            },
            amount: "100000000000000",
            amountUsd: "0.25",
        });

        const result = adaptFees(makeResponse({ gas: gasFee }));

        expect(result).toEqual({
            bridgeFee: undefined,
            originGas: {
                amount: "100000000000000",
                amountUsd: "0.25",
                token: { symbol: "ETH", decimals: 18, address: NATIVE_ADDRESS },
            },
        });
    });

    it("maps both relayer and gas fees together", () => {
        const gasFee = makeFeeEntry({
            currency: {
                chainId: 1,
                address: NATIVE_ADDRESS,
                symbol: "ETH",
                name: "Ether",
                decimals: 18,
            },
            amount: "100000000000000",
            amountUsd: "0.25",
        });

        const result = adaptFees(makeResponse({ relayer: makeFeeEntry(), gas: gasFee }));

        expect(result!.bridgeFee).toBeDefined();
        expect(result!.originGas).toBeDefined();
    });

    it("omits amountUsd when not present in source", () => {
        const fee = makeFeeEntry({ amountUsd: undefined });
        const result = adaptFees(makeResponse({ relayer: fee }));

        expect(result!.bridgeFee!.amountUsd).toBeUndefined();
    });
});
