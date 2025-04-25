import { Address, IBlockchainProvider } from "@ts-turborepo-boilerplate/sample-lib";

export class BalancesController {
    constructor(private readonly blockchainProvider: IBlockchainProvider) {}

    public async addBalances(addressA: Address, addressB: Address): Promise<bigint> {
        const balances = await Promise.all([
            this.blockchainProvider.getBalance(addressA),
            this.blockchainProvider.getBalance(addressB),
        ]);

        return balances[0] + balances[1];
    }
}
