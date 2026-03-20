import type { Address } from "viem";

import type { LifiIntentsQuoteResponse } from "../../../src/protocols/lifi-intents/schemas.js";

export const LIFI_ADDRESSES = {
    USER: "0x382c45ddbb74c19B8bD3E87441986C30F0B73936" as Address,
    USDC_BASE: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Address,
    USDC_ARB: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as Address,
    INPUT_SETTLER: "0x000025c3226C00B2Cdc200005a1600509f4e00C0" as Address,
} as const;

export const LIFI_CHAIN_IDS = {
    BASE: 8453,
    ARBITRUM: 42161,
} as const;

const BASE_CHAIN = `eip155:${LIFI_CHAIN_IDS.BASE}`;
const ARB_CHAIN = `eip155:${LIFI_CHAIN_IDS.ARBITRUM}`;

export function getMockedLifiQuoteResponse(): LifiIntentsQuoteResponse {
    return {
        quotes: [
            {
                order: {
                    type: "oif-user-open-v0",
                    openIntentTx: {
                        chain: BASE_CHAIN,
                        to: LIFI_ADDRESSES.INPUT_SETTLER,
                        data: "0x7515fd5600000000000000000000000000000000000000000000000000000000deadbeef",
                        gasRequired: "250000",
                    },
                    checks: {
                        allowances: [
                            {
                                chain: BASE_CHAIN,
                                token: LIFI_ADDRESSES.USDC_BASE,
                                user: LIFI_ADDRESSES.USER,
                                spender: LIFI_ADDRESSES.INPUT_SETTLER,
                                required: "10000000",
                            },
                        ],
                    },
                },
                quoteId: "quote_test123",
                provider: "LI.FI Intent",
                validUntil: Math.floor(Date.now() / 1000) + 600,
                preview: {
                    inputs: [
                        {
                            chain: BASE_CHAIN,
                            user: LIFI_ADDRESSES.USER,
                            asset: LIFI_ADDRESSES.USDC_BASE,
                            amount: "10000000",
                        },
                    ],
                    outputs: [
                        {
                            chain: ARB_CHAIN,
                            receiver: LIFI_ADDRESSES.USER,
                            asset: LIFI_ADDRESSES.USDC_ARB,
                            amount: "9968269",
                        },
                    ],
                },
                failureHandling: "refund-automatic",
                partialFill: false,
                metadata: {
                    exclusiveFor: "0x94807fe4300d15909c1a4fd39f76c61d68aee11e",
                },
            },
        ],
    };
}

export function getMockedLifiEmptyQuoteResponse(): LifiIntentsQuoteResponse {
    return { quotes: [] };
}

export function getMockedLifiNullOrderResponse(): LifiIntentsQuoteResponse {
    return {
        quotes: [
            {
                order: null,
                quoteId: "quote_nullorder",
                preview: {
                    inputs: [
                        {
                            chain: BASE_CHAIN,
                            user: LIFI_ADDRESSES.USER,
                            asset: LIFI_ADDRESSES.USDC_BASE,
                            amount: "10000000",
                        },
                    ],
                    outputs: [
                        {
                            chain: ARB_CHAIN,
                            receiver: LIFI_ADDRESSES.USER,
                            asset: LIFI_ADDRESSES.USDC_ARB,
                            amount: "9968269",
                        },
                    ],
                },
                failureHandling: "refund-automatic",
                partialFill: false,
                metadata: { exclusiveFor: null },
            },
        ],
    };
}
