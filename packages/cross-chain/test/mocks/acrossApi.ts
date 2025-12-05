import { Address } from "viem";

import { AcrossGetQuoteResponse } from "../../src/internal.js";

export const getMockedAcrossApiResponse = (
    override?: Partial<AcrossGetQuoteResponse>,
): AcrossGetQuoteResponse => {
    return {
        id: "test-quote-id",
        inputToken: {
            address: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14" as Address,
            chainId: 11155111,
            decimals: 18,
            symbol: "WETH",
            name: "Wrapped Ether",
        },
        outputToken: {
            address: "0x4200000000000000000000000000000000000006" as Address,
            chainId: 84532,
            decimals: 18,
            symbol: "WETH",
            name: "Wrapped Ether",
        },
        inputAmount: "1000000000000000000",
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
            chainId: 11155111,
            to: "0x5c7BCd6E7De5423a257D81B442095A1a6ced35C5" as Address,
            data: "0x1234567890abcdef",
            gas: "250000",
            maxFeePerGas: "100000000000",
            maxPriorityFeePerGas: "2000000000",
        },
        expectedFillTime: 60,
        ...override,
    };
};
