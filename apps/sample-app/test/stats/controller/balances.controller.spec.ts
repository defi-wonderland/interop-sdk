import { IBlockchainProvider } from "@ts-turborepo-boilerplate/sample-lib";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BalancesController } from "../../../src/stats/index.js";

describe("BalancesController", () => {
    let balancesController: BalancesController;
    let blockchainProviderMock: IBlockchainProvider;

    beforeEach(() => {
        blockchainProviderMock = {
            getBalance: vi.fn(),
        };
        balancesController = new BalancesController(blockchainProviderMock);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("addBalances", () => {
        it("should return the sum of balances for two addresses", async () => {
            const addressA = "0x1234567890abcdef";
            const addressB = "0xabcdef1234567890";
            const balanceA = BigInt(1000000000000000000);
            const balanceB = BigInt(2000000000000000000);

            vi.spyOn(blockchainProviderMock, "getBalance").mockResolvedValueOnce(balanceA);
            vi.spyOn(blockchainProviderMock, "getBalance").mockResolvedValueOnce(balanceB);

            const result = await balancesController.addBalances(addressA, addressB);

            expect(result).toEqual(balanceA + balanceB);
            expect(blockchainProviderMock.getBalance).toHaveBeenCalledTimes(2);
            expect(blockchainProviderMock.getBalance).toHaveBeenCalledWith(addressA);
            expect(blockchainProviderMock.getBalance).toHaveBeenCalledWith(addressB);
        });
    });
});
