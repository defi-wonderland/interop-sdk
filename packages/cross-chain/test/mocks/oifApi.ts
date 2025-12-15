import { GetQuoteResponse } from "@openintentsframework/oif-specs";
import { hexToBytes } from "viem";

const getAddresses = (
    useInteroperableAddresses: boolean,
): { token: string; spender: string; user: string; outputAsset: string; quoteId: string } => {
    if (useInteroperableAddresses) {
        return {
            token: "0x000100000101A0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
            spender: "0x00010000010195ad61b0a150d79219dcf64e1e6cc01f0c0c8a4a",
            user: "0x000100000101742d35Cc6634C0532925a3b844Bc9e7595f0bEb8",
            outputAsset: "0x000100000101dAC17F958D2ee523a2206206994597C13D831ec7",
            quoteId: "test-quote-id-123",
        };
    }

    return {
        token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        spender: "0x95ad61b0a150d79219dcf64e1e6cc01f0c0c8a4a",
        user: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb8",
        outputAsset: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        quoteId: "test-quote-viem-integration",
    };
};

export const getMockedOifQuoteResponse = (options?: {
    useInteroperableAddresses?: boolean;
    override?: Partial<GetQuoteResponse>;
}): GetQuoteResponse => {
    const { token, spender, user, outputAsset, quoteId } = getAddresses(
        options?.useInteroperableAddresses ?? true,
    );

    const nowSeconds = Math.floor(Date.now() / 1000);
    const validUntil = nowSeconds + 600;
    const deadline = nowSeconds + 1800;

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
                                    token,
                                    amount: "1000000000000000000",
                                },
                            ],
                            spender,
                            nonce: "123",
                            deadline,
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
                            user,
                            asset: token,
                            amount: "1000000000000000000",
                        },
                    ],
                    outputs: [
                        {
                            receiver: user,
                            asset: outputAsset,
                            amount: "990000000000000000",
                        },
                    ],
                },
                validUntil,
                eta: 30,
                quoteId,
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
        ...options?.override,
    };
};

export const getMockedOifUserOpenQuoteResponse = (): GetQuoteResponse => {
    const base = getMockedOifQuoteResponse();
    const quote = base.quotes[0];
    if (!quote) throw new Error("No quote in base response");

    return {
        quotes: [
            {
                ...quote,
                order: {
                    type: "oif-user-open-v0",
                    openIntentTx: {
                        to: "0x000100000101A0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                        data: hexToBytes("0x095ea7b3000000000000000000000000"),
                        gasRequired: "50000",
                    },
                    checks: {
                        allowances: [
                            {
                                token: "0x000100000101A0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                                user: "0x000100000101742d35Cc6634C0532925a3b844Bc9e7595f0bEb8",
                                spender: "0x00010000010195ad61b0a150d79219dcf64e1e6cc01f0c0c8a4a",
                                required: "1000000000000000000",
                            },
                        ],
                    },
                },
                quoteId: "test-quote-user-open-123",
            },
        ],
    };
};
