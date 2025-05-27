import { Quote } from "@across-protocol/app-sdk";
import { getAddress } from "viem";

export const getMockedQuote = (quote?: Partial<Quote>): Quote => {
    return {
        limits: {
            minDeposit: BigInt(1),
            maxDeposit: BigInt(1),
            maxDepositInstant: BigInt(1),
            ...quote?.limits,
        },
        deposit: {
            inputAmount: BigInt(1),
            outputAmount: BigInt(1),
            recipient: getAddress("0x0000000000000000000000000000000000000000"),
            message: "0x0000000000000000000000000000000000000000",
            quoteTimestamp: 1,
            fillDeadline: 1,
            exclusiveRelayer: "0x0000000000000000000000000000000000000000",
            exclusivityDeadline: 1,
            spokePoolAddress: getAddress("0x0000000000000000000000000000000000000000"),
            destinationSpokePoolAddress: getAddress("0x0000000000000000000000000000000000000000"),
            originChainId: 11155111,
            destinationChainId: 11155111,
            inputToken: getAddress("0x0000000000000000000000000000000000000000"),
            outputToken: getAddress("0x0000000000000000000000000000000000000000"),
            isNative: false,
            ...quote?.deposit,
        },
        fees: {
            lpFee: {
                pct: BigInt(1),
                total: BigInt(1),
            },
            relayerGasFee: {
                pct: BigInt(1),
                total: BigInt(1),
            },
            relayerCapitalFee: {
                pct: BigInt(1),
                total: BigInt(1),
            },
            totalRelayFee: {
                pct: BigInt(1),
                total: BigInt(1),
            },
            ...quote?.fees,
        },
        isAmountTooLow: false,
        estimatedFillTimeSec: 1,
        ...quote,
    };
};
