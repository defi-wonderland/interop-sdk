import { describe, expect, it } from "vitest";

import type { BungeeAutoRoute } from "../../../../src/protocols/bungee/schemas.js";
import { adaptFees } from "../../../../src/protocols/bungee/adapters/quoteFeeAdapter.js";

const MOCK_GAS_FEE = {
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
};

const MOCK_ROUTE_FEE = {
    token: {
        chainId: 1,
        address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        name: "USD Coin",
        symbol: "USDC",
        decimals: 6,
    },
    amount: "2585",
    feeInUsd: 0.002585,
    priceInUsd: 1,
};

function buildAutoRoute(overrides: Partial<BungeeAutoRoute> = {}): BungeeAutoRoute {
    return {
        gasFee: MOCK_GAS_FEE,
        routeDetails: { name: "test", logoURI: "", routeFee: MOCK_ROUTE_FEE },
        ...overrides,
    } as BungeeAutoRoute;
}

describe("adaptFees", () => {
    it("maps gasFee to originGas", () => {
        const autoRoute = buildAutoRoute({
            routeDetails: { name: "test", logoURI: "", routeFee: null },
        });
        const result = adaptFees(autoRoute);

        expect(result?.originGas?.amount).toBe("420000000000000");
        expect(result?.originGas?.amountUsd).toBe("0.5");
        expect(result?.originGas?.token?.symbol).toBe("ETH");
        expect(result?.originGas?.token?.decimals).toBe(18);
        expect(result?.bridgeFee).toBeUndefined();
    });

    it("maps routeFee to bridgeFee", () => {
        const autoRoute = buildAutoRoute({ gasFee: null } as unknown as Partial<BungeeAutoRoute>);
        const result = adaptFees(autoRoute);

        expect(result?.bridgeFee?.amount).toBe("2585");
        expect(result?.bridgeFee?.amountUsd).toBe("0.002585");
        expect(result?.bridgeFee?.token?.symbol).toBe("USDC");
        expect(result?.bridgeFee?.token?.decimals).toBe(6);
        expect(result?.originGas).toBeUndefined();
    });

    it("maps both gasFee and routeFee when present", () => {
        const autoRoute = buildAutoRoute();
        const result = adaptFees(autoRoute);

        expect(result?.originGas?.amount).toBe("420000000000000");
        expect(result?.bridgeFee?.amount).toBe("2585");
    });

    it("returns undefined when both gasFee and routeFee are absent", () => {
        const autoRoute = buildAutoRoute({
            gasFee: null,
            routeDetails: { name: "test", logoURI: "", routeFee: null },
        } as unknown as Partial<BungeeAutoRoute>);
        const result = adaptFees(autoRoute);

        expect(result).toBeUndefined();
    });
});
