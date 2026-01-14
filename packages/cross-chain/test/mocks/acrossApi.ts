import { AcrossGetQuoteResponse } from "../../src/internal.js";
import { ACROSS_CONTRACTS, CHAIN_IDS, TEST_AMOUNTS, TESTNET_TOKENS } from "./fixtures.js";

export const getMockedAcrossApiResponse = (
    override?: Partial<AcrossGetQuoteResponse>,
): AcrossGetQuoteResponse => {
    return {
        id: "test-quote-id",
        inputToken: {
            address: TESTNET_TOKENS.WETH_SEPOLIA,
            chainId: CHAIN_IDS.SEPOLIA,
            decimals: 18,
            symbol: "WETH",
            name: "Wrapped Ether",
        },
        outputToken: {
            address: TESTNET_TOKENS.WETH_BASE_SEPOLIA,
            chainId: CHAIN_IDS.BASE_SEPOLIA,
            decimals: 18,
            symbol: "WETH",
            name: "Wrapped Ether",
        },
        inputAmount: TEST_AMOUNTS.ONE_ETHER.toString(),
        expectedOutputAmount: "990000000000000000",
        minOutputAmount: "980000000000000000",
        fees: {
            total: {
                amount: "10000000000000000",
                amountUsd: "30",
                pct: "1",
            },
        },
        swapTx: {
            simulationSuccess: true,
            chainId: CHAIN_IDS.SEPOLIA,
            to: ACROSS_CONTRACTS.SPOKE_POOL_SEPOLIA,
            data: "0x1234567890abcdef",
            gas: "250000",
            maxFeePerGas: "100000000000",
            maxPriorityFeePerGas: "2000000000",
        },
        expectedFillTime: 60,
        ...override,
    };
};
