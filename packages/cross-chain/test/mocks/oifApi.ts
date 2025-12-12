import { GetQuoteResponse } from "@openintentsframework/oif-specs";

export const getMockedOifQuoteResponse = (
    override?: Partial<GetQuoteResponse>,
): GetQuoteResponse => {
    return {
        quotes: [
            {
                order: {
                    type: "oif-escrow-v0",
                    payload: {
                        signatureType: "eip712",
                        domain: {
                            name: "Permit2",
                            version: "1",
                            chainId: 1,
                            verifyingContract: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
                        },
                        primaryType: "PermitBatchWitnessTransferFrom",
                        message: {
                            permitted: [
                                {
                                    token: "0x000100000101A0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                                    amount: "1000000000000000000",
                                },
                            ],
                            spender: "0x00010000010195ad61b0a150d79219dcf64e1e6cc01f0c0c8a4a",
                            nonce: "123",
                            deadline: 1700000000,
                        },
                        types: {
                            PermitBatchWitnessTransferFrom: [
                                { name: "permitted", type: "TokenPermissions[]" },
                                { name: "spender", type: "address" },
                                { name: "nonce", type: "uint256" },
                                { name: "deadline", type: "uint256" },
                            ],
                            TokenPermissions: [
                                { name: "token", type: "address" },
                                { name: "amount", type: "uint256" },
                            ],
                        },
                    },
                },
                preview: {
                    inputs: [
                        {
                            user: "0x000100000101742d35Cc6634C0532925a3b844Bc9e7595f0bEb8",
                            asset: "0x000100000101A0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                            amount: "1000000000000000000",
                        },
                    ],
                    outputs: [
                        {
                            receiver: "0x000100000101742d35Cc6634C0532925a3b844Bc9e7595f0bEb8",
                            asset: "0x000100000101dAC17F958D2ee523a2206206994597C13D831ec7",
                            amount: "990000000000000000",
                        },
                    ],
                },
                validUntil: 1700000000,
                eta: 30,
                quoteId: "test-quote-id-123",
                provider: "test-solver",
                failureHandling: "refund-automatic",
                partialFill: false,
                metadata: {
                    fees: {
                        total: "10000000000000000",
                    },
                },
            },
        ],
        ...override,
    };
};
