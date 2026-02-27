import { RelayQuoteResponse } from "../../src/internal.js";
import { CHAIN_IDS, TEST_ADDRESSES, TEST_AMOUNTS, TESTNET_TOKENS } from "./fixtures.js";

/**
 * Factory for mock Relay API responses
 * Mirrors the pattern from acrossApi.ts
 */
export const getMockedRelayQuoteResponse = (
    override?: Partial<RelayQuoteResponse>,
): RelayQuoteResponse => {
    return {
        steps: [
            {
                id: "deposit",
                kind: "transaction",
                action: "deposit",
                description: "Deposit funds for cross-chain transfer",
                requestId: "0xabc123def456",
                items: [
                    {
                        status: "incomplete",
                        data: {
                            from: TEST_ADDRESSES.USER,
                            to: "0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC",
                            data: "0x1234567890abcdef",
                            value: TEST_AMOUNTS.ONE_ETHER.toString(),
                            chainId: CHAIN_IDS.SEPOLIA,
                            maxFeePerGas: "100000000000",
                            maxPriorityFeePerGas: "2000000000",
                        },
                    },
                ],
            },
        ],
        fees: {
            gas: { amount: "1000000000000000", currency: "eth" },
            relayer: { amount: "5000000000000000", currency: "eth" },
        },
        details: {
            currencyIn: {
                amount: TEST_AMOUNTS.ONE_ETHER.toString(),
                amountFormatted: "1.0",
                currency: {
                    chainId: CHAIN_IDS.SEPOLIA,
                    address: TESTNET_TOKENS.WETH_SEPOLIA,
                    symbol: "WETH",
                    decimals: 18,
                },
            },
            currencyOut: {
                amount: "990000000000000000",
                amountFormatted: "0.99",
                currency: {
                    chainId: CHAIN_IDS.BASE_SEPOLIA,
                    address: TESTNET_TOKENS.WETH_BASE_SEPOLIA,
                    symbol: "WETH",
                    decimals: 18,
                },
            },
            timeEstimate: 30,
            rate: "0.99",
        },
        ...override,
    };
};

/**
 * Factory for multi-step Relay response (approve + deposit)
 */
export const getMockedRelayMultiStepResponse = (): RelayQuoteResponse => {
    return {
        steps: [
            {
                id: "approve",
                kind: "transaction",
                action: "approve",
                description: "Approve token spending",
                items: [
                    {
                        status: "incomplete",
                        data: {
                            from: TEST_ADDRESSES.USER,
                            to: TESTNET_TOKENS.WETH_SEPOLIA,
                            data: "0x095ea7b3000000000000000000000000000000000000000000000000000000000000dead0000000000000000000000000000000000000000000000000de0b6b3a7640000",
                            chainId: CHAIN_IDS.SEPOLIA,
                        },
                    },
                ],
            },
            {
                id: "deposit",
                kind: "transaction",
                action: "deposit",
                description: "Deposit funds for cross-chain transfer",
                requestId: "0xrequest123",
                items: [
                    {
                        status: "incomplete",
                        data: {
                            from: TEST_ADDRESSES.USER,
                            to: "0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC",
                            data: "0xdeadbeef",
                            value: TEST_AMOUNTS.ONE_ETHER.toString(),
                            chainId: CHAIN_IDS.SEPOLIA,
                        },
                    },
                ],
            },
        ],
        details: {
            currencyIn: {
                amount: TEST_AMOUNTS.ONE_ETHER.toString(),
            },
            currencyOut: {
                amount: "990000000000000000",
            },
            timeEstimate: 45,
        },
    };
};
