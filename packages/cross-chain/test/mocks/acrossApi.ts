import { encodeFunctionData, Hex, pad } from "viem";

import { addressToBytes32 } from "../../src/core/utils/addressHelpers.js";
import { AcrossGetQuoteResponse } from "../../src/internal.js";
import { ACROSS_SPOKE_POOL_DEPOSIT_ABI } from "../../src/protocols/across/constants.js";
import {
    ACROSS_CONTRACTS,
    CHAIN_IDS,
    TEST_ADDRESSES,
    TEST_AMOUNTS,
    TESTNET_TOKENS,
} from "./fixtures.js";

const ZERO_BYTES32 = pad("0x00" as Hex, { size: 32 });

const DEFAULT_DEPOSIT_CALLDATA: Hex = encodeFunctionData({
    abi: ACROSS_SPOKE_POOL_DEPOSIT_ABI,
    functionName: "deposit",
    args: [
        addressToBytes32(TEST_ADDRESSES.USER),
        addressToBytes32(TEST_ADDRESSES.RECEIVER),
        addressToBytes32(TESTNET_TOKENS.WETH_SEPOLIA),
        addressToBytes32(TESTNET_TOKENS.WETH_BASE_SEPOLIA),
        TEST_AMOUNTS.ONE_ETHER,
        990_000_000_000_000_000n,
        BigInt(CHAIN_IDS.BASE_SEPOLIA),
        ZERO_BYTES32,
        0,
        0,
        0,
        "0x",
    ],
});

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
            data: DEFAULT_DEPOSIT_CALLDATA,
            gas: "250000",
            maxFeePerGas: "100000000000",
            maxPriorityFeePerGas: "2000000000",
        },
        expectedFillTime: 60,
        ...override,
    };
};
