import { inspect } from "util";
import { BlockchainProvider, IBlockchainProvider } from "@ts-turborepo-boilerplate/sample-lib";

import { environment } from "./config/env.js";
import { BalancesController } from "./stats/index.js";

const main = async (): Promise<void> => {
    const dataProvider: IBlockchainProvider = new BlockchainProvider(environment.RPC_URL);

    const balanceController = new BalancesController(dataProvider);

    const vitalikAddress = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
    const zeroAddress = "0x0000000000000000000000000000000000000000";

    const balance = await balanceController.addBalances(vitalikAddress, zeroAddress);

    console.log(`Vitalik's and Zero summed balance is: ${balance}`);
};

process.on("unhandledRejection", (reason, p) => {
    console.error(`Unhandled Rejection at: \n${inspect(p, undefined, 100)}, \nreason: ${reason}`);
});

process.on("uncaughtException", (error: Error) => {
    console.error(
        `An uncaught exception occurred: ${error}\n` + `Exception origin: ${error.stack}`,
    );
});

main().catch((err) => {
    console.error(`Caught error in main handler: ${err}`);
});
