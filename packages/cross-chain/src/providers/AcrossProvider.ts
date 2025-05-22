import { getQuote, Quote } from "@across-protocol/app-sdk";
import {
    Address,
    encodeAbiParameters,
    encodeFunctionData,
    erc20Abi,
    formatUnits,
    Hex,
    isAddress,
    isHex,
    pad,
    PublicClient,
    TransactionRequest,
} from "viem";
import { z } from "zod";

import {
    ACROSS_OIF_ADAPTER_CONTRACT_ADDRESSES,
    ACROSS_ORDER_DATA_ABI,
    ACROSS_ORDER_DATA_TYPE,
    ACROSS_TESTING_API_URL,
    CrossChainProvider,
    Fee,
    formatTokenAmount,
    GetQuoteParams,
    GetQuoteResponse,
    getTokenAllowance,
    OPEN_ABI,
    SUPPORTED_CHAINS,
    TransferGetQuoteParams,
    TransferGetQuoteParamsSchema,
    TransferGetQuoteResponse,
    UnsupportedAction,
    UnsupportedChainId,
} from "../internal.js";

const AcrossTransferOpenParamsSchema = z.object({
    action: z.literal("crossChainTransfer"),
    params: z.object({
        inputChainId: z.number(),
        outputChainId: z.number(),
        inputTokenAddress: z.string().refine((val) => isAddress(val), {
            message: "Invalid input token address",
        }),
        outputTokenAddress: z.string().refine((val) => isAddress(val), {
            message: "Invalid output token address",
        }),
        inputAmount: z.bigint(),
        fillDeadline: z.number(),
        orderDataType: z.literal(ACROSS_ORDER_DATA_TYPE),
        orderData: z.string().refine((val) => isHex(val), {
            message: "Invalid order data",
        }),
    }),
});

type AcrossTransferOpenParams = z.infer<typeof AcrossTransferOpenParamsSchema>;

type AcrossOpenParams = AcrossTransferOpenParams;

type AcrossConfigs = {
    userAddress: Address;
};

type AcrossDependencies = {
    publicClient: PublicClient;
};

/**
 * An implementation of the CrossChainProvider interface for the Across protocol
 * @see https://docs.across.to/
 * @param config - The configuration for the provider
 * @param dependencies - The dependencies for the provider
 * @returns A provider for the Across protocol
 */
export class AcrossProvider extends CrossChainProvider<AcrossOpenParams> {
    readonly protocolName = "across";
    private readonly userAddress: Address;
    private readonly publicClient: PublicClient;

    constructor(config: AcrossConfigs, dependencies: AcrossDependencies) {
        super();
        this.userAddress = config.userAddress;
        this.publicClient = dependencies.publicClient;
    }

    /**
     * Get a quote for an Across cross-chain transfer calling to the Across SDK
     * @param params - The parameters for the action
     * @returns A quote for the action
     */
    private async getAcrossQuote(params: TransferGetQuoteParams): Promise<Quote> {
        const route = {
            originChainId: Number(params.inputChainId),
            destinationChainId: Number(params.outputChainId),
            inputToken: params.inputTokenAddress,
            outputToken: params.outputTokenAddress,
        };

        return await getQuote({
            route,
            inputAmount: params.inputAmount,
            apiUrl: ACROSS_TESTING_API_URL,
        });
    }

    /**
     * Pad the depositor address
     * @param address - The address to pad
     * @returns The padded address
     */
    private padAddress(address: Hex): string {
        return pad(address, { size: 32 });
    }

    /**
     * Get the open parameters for an Across cross-chain transfer
     * @param quote - The quote to get the open parameters for
     * @returns The open parameters
     */
    private async getAcrossOpenParams(quote: Quote): Promise<AcrossTransferOpenParams> {
        const orderData = await encodeAbiParameters(ACROSS_ORDER_DATA_ABI, [
            {
                inputToken: quote.deposit.inputToken,
                inputAmount: quote.deposit.inputAmount,
                outputToken: quote.deposit.outputToken,
                outputAmount: quote.deposit.outputAmount,
                destinationChainId: quote.deposit.destinationChainId,
                recipient: quote.deposit.recipient ?? this.padAddress(this.userAddress),
                exclusiveRelayer: quote.deposit.exclusiveRelayer,
                exclusivityPeriod: quote.deposit.exclusivityDeadline,
                depositNonce: 0,
                message: "0x",
            },
        ]);

        const quoteResponse: AcrossTransferOpenParams = {
            action: "crossChainTransfer",
            params: {
                inputChainId: quote.deposit.originChainId,
                outputChainId: quote.deposit.destinationChainId,
                inputTokenAddress: quote.deposit.inputToken,
                outputTokenAddress: quote.deposit.outputToken,
                inputAmount: quote.deposit.inputAmount,
                fillDeadline: quote.deposit.fillDeadline,
                orderDataType: ACROSS_ORDER_DATA_TYPE,
                orderData,
            },
        };

        return quoteResponse;
    }

    /**
     * Calculate the total fee for an Across quote
     * @param quote - The quote to calculate the fee for
     * @returns The total fee
     */
    private async calculateTotalFee(quote: Quote): Promise<bigint> {
        return quote.fees.totalRelayFee.total;
    }

    /**
     * Calculate the percent fee for an Across quote
     * @param quote - The quote to calculate the fee for
     * @returns The percent fee
     */
    private async calculatePercentFee(quote: Quote): Promise<bigint> {
        return quote.fees.totalRelayFee.pct;
    }

    /**
     * Calculate the total and percent fees for an Across quote
     * @param quote - The quote to calculate the fees for
     * @returns The total and percent fees
     */
    private async calculateFee(quote: Quote): Promise<Fee> {
        const totalFee = await this.calculateTotalFee(quote);
        const percentFee = await this.calculatePercentFee(quote);

        const inputChain = SUPPORTED_CHAINS.find(
            (chain) => chain.id === Number(quote.deposit.originChainId),
        );

        if (!inputChain) {
            throw new UnsupportedChainId(quote.deposit.originChainId);
        }

        return {
            total: await formatTokenAmount(
                {
                    amount: totalFee,
                    tokenAddress: quote.deposit.inputToken,
                    chain: inputChain,
                },
                { publicClient: this.publicClient },
            ),
            percent: formatUnits(percentFee, 15),
        };
    }

    /**
     * Get a quote for an Across cross-chain transfer
     * @param params - The parameters for the action
     * @returns A quote for the action
     */
    private async getTransferQuote(
        params: TransferGetQuoteParams,
    ): Promise<TransferGetQuoteResponse<AcrossOpenParams>> {
        const inputChain = SUPPORTED_CHAINS.find(
            (chain) => chain.id === Number(params.inputChainId),
        );

        if (!inputChain) {
            throw new UnsupportedChainId(params.inputChainId);
        }

        const outputChain = SUPPORTED_CHAINS.find(
            (chain) => chain.id === Number(params.outputChainId),
        );

        if (!outputChain) {
            throw new UnsupportedChainId(params.outputChainId);
        }

        const quote = await this.getAcrossQuote(params);
        const openParams = await this.getAcrossOpenParams(quote);
        const fee = await this.calculateFee(quote);
        return {
            protocol: this.protocolName,
            action: "crossChainTransfer",
            isAmountTooLow: quote.isAmountTooLow,
            output: {
                inputTokenAddress: quote.deposit.inputToken,
                outputTokenAddress: quote.deposit.outputToken,
                inputAmount: await formatTokenAmount(
                    {
                        amount: quote.deposit.inputAmount,
                        tokenAddress: quote.deposit.inputToken,
                        chain: inputChain,
                    },
                    { publicClient: this.publicClient },
                ),
                outputAmount: await formatTokenAmount(
                    {
                        amount: quote.deposit.outputAmount,
                        tokenAddress: quote.deposit.outputToken,
                        chain: outputChain,
                    },
                    { publicClient: this.publicClient },
                ),
                inputChainId: quote.deposit.originChainId,
                outputChainId: quote.deposit.destinationChainId,
            },
            openParams,
            fee,
        } as TransferGetQuoteResponse<AcrossOpenParams>;
    }

    /**
     * @inheritdoc
     */
    async getQuote<Action extends AcrossOpenParams["action"]>(
        action: Action,
        input: GetQuoteParams<Action>,
    ): Promise<GetQuoteResponse<Action, AcrossOpenParams>> {
        switch (action) {
            case "crossChainTransfer":
                const transferParams = TransferGetQuoteParamsSchema.parse(input);

                const quoteResponse = await this.getTransferQuote(transferParams);

                return quoteResponse as GetQuoteResponse<Action, AcrossOpenParams>;
            default:
                throw new UnsupportedAction(action);
        }
    }

    /**
     * Get the allowance transaction for the Across settler contract
     * @param params - The parameters for the action
     * @returns The allowance transaction
     */
    private async getSettlerAllowanceTransaction(
        params: AcrossTransferOpenParams,
    ): Promise<TransactionRequest[]> {
        const { inputChainId, inputTokenAddress, inputAmount } = params.params;

        const result: TransactionRequest[] = [];

        const inputChain = SUPPORTED_CHAINS.find((chain) => chain.id === Number(inputChainId));

        if (!inputChain) {
            throw new UnsupportedChainId(inputChainId);
        }

        const settlerContractAddress = ACROSS_OIF_ADAPTER_CONTRACT_ADDRESSES[
            Number(inputChainId)
        ] as Hex;

        const currentAllowance = await getTokenAllowance(
            {
                tokenAddress: inputTokenAddress,
                chain: inputChain,
                owner: this.userAddress,
                spender: settlerContractAddress,
            },
            { publicClient: this.publicClient },
        );

        if (currentAllowance >= inputAmount) {
            return result;
        }

        const approvalData = encodeFunctionData({
            abi: erc20Abi,
            functionName: "approve",
            args: [settlerContractAddress, inputAmount],
        });

        const allowanceTx = await this.publicClient.prepareTransactionRequest({
            account: this.userAddress,
            to: inputTokenAddress,
            data: approvalData,
            chain: inputChain,
        });

        return [allowanceTx];
    }

    /**
     * Simulate the open transaction for an Across cross-chain transfer
     * @param params - The parameters for the action
     * @returns The open transaction
     */
    private async simulateTransferOpen(
        params: AcrossTransferOpenParams,
    ): Promise<TransactionRequest[]> {
        const { fillDeadline, orderDataType, orderData, inputChainId } = params.params;
        const result: TransactionRequest[] = [];

        const inputChain = SUPPORTED_CHAINS.find((chain) => chain.id === Number(inputChainId));

        if (!inputChain) {
            throw new UnsupportedChainId(inputChainId);
        }

        const settlerContractAddress = ACROSS_OIF_ADAPTER_CONTRACT_ADDRESSES[Number(inputChainId)];

        const allowanceTx = await this.getSettlerAllowanceTransaction(params);

        result.push(...allowanceTx);

        const openData = encodeFunctionData({
            abi: OPEN_ABI,
            functionName: "open",
            args: [{ fillDeadline, orderDataType, orderData }],
        });

        const openTx = await this.publicClient.prepareTransactionRequest({
            account: this.userAddress,
            to: settlerContractAddress,
            data: openData,
            chain: inputChain,
            gas: 21000n,
        });

        return [...result, openTx];
    }

    /**
     * @inheritdoc
     */
    validateOpenParams(params: AcrossOpenParams): void {
        AcrossTransferOpenParamsSchema.parse(params);
    }

    /**
     * @inheritdoc
     */
    async validatedSimulateOpen(params: AcrossOpenParams): Promise<TransactionRequest[]> {
        const { action } = params;

        switch (action) {
            case "crossChainTransfer":
                const transferParams = AcrossTransferOpenParamsSchema.parse(params);
                return await this.simulateTransferOpen(transferParams);
            default:
                throw new UnsupportedAction(action);
        }
    }
}
