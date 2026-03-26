import { describe, expect, it } from "vitest";

import type { BungeeAutoRoute } from "../../../../src/protocols/bungee/schemas.js";
import { adaptFees } from "../../../../src/protocols/bungee/adapters/quoteFeeAdapter.js";

function buildAutoRoute(overrides: Partial<BungeeAutoRoute> = {}): BungeeAutoRoute {
    return {
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
        ...overrides,
    } as BungeeAutoRoute;
}

describe("adaptFees", () => {
    it("maps gasFee to originGas", () => {
        const autoRoute = buildAutoRoute();
        const result = adaptFees(autoRoute);

        expect(result?.originGas?.amount).toBe("420000000000000");
        expect(result?.originGas?.amountUsd).toBe("0.5");
        expect(result?.originGas?.token).toBeDefined();
        expect(result?.originGas?.token?.symbol).toBe("ETH");
        expect(result?.originGas?.token?.decimals).toBe(18);
    });

    it("returns undefined when gasFee is null", () => {
        const autoRoute = buildAutoRoute({ gasFee: null } as unknown as Partial<BungeeAutoRoute>);
        const result = adaptFees(autoRoute);

        expect(result).toBeUndefined();
    });
});
