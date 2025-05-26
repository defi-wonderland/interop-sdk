import { getQuote, Quote } from "@across-protocol/app-sdk";
import {
    Address,
    Chain,
    createPublicClient,
    encodeAbiParameters,
    encodeFunctionData,
    erc20Abi,
    formatUnits,
    Hex,
    http,
    pad,
    PublicClient,
    TransactionRequest,
} from "viem";

import {
    ACROSS_OIF_ADAPTER_CONTRACT_ADDRESSES,
    ACROSS_OPEN_GAS_LIMIT,
    ACROSS_ORDER_DATA_ABI,
    ACROSS_ORDER_DATA_TYPE,
    ACROSS_TESTING_API_URL,
    AcrossOpenParams,
    AcrossTransferOpenParams,
    AcrossTransferOpenParamsSchema,
    CrossChainProvider,
    Fee,
    formatTokenAmount,
    GetQuoteParams,
    GetQuoteResponse,
    getTokenAllowance,
    OPEN_ABI,
    parseTokenAmount,
    SUPPORTED_CHAINS,
    TransferGetQuoteParams,
    TransferGetQuoteParamsSchema,
    TransferGetQuoteResponse,
    UnsupportedAction,
    UnsupportedChainId,
} from "../internal.js";

/**
 * An implementation of the CrossChainProvider interface for the Across protocol
 * @see https://docs.across.to/
 * @param config - The configuration for the provider
 * @param dependencies - The dependencies for the provider
 * @returns A provider for the Across protocol
 */
export class AcrossProvider extends CrossChainProvider<AcrossOpenParams> {
    readonly protocolName = "across";
    private readonly clientCache: Map<number, PublicClient> = new Map();

    constructor() {
        super();
    }

    private getPublicClient({ chain }: { chain: Chain }): PublicClient {
        if (this.clientCache.has(chain.id)) {
            return this.clientCache.get(chain.id)!;
        }
        const client = createPublicClient({
            chain,
            transport: http(),
        });
        this.clientCache.set(chain.id, client);
        return client;
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

        const inputChain = SUPPORTED_CHAINS.find(
            (chain) => chain.id === Number(params.inputChainId),
        );

        if (!inputChain) {
            throw new UnsupportedChainId(params.inputChainId);
        }

        const inputAmount = await parseTokenAmount(
            {
                amount: params.inputAmount,
                tokenAddress: params.inputTokenAddress,
                chain: inputChain,
            },
            { publicClient: this.getPublicClient({ chain: inputChain }) },
        );

        return await getQuote({
            route,
            inputAmount,
            apiUrl: ACROSS_TESTING_API_URL,
            recipient: params.recipient,
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
    private async getAcrossOpenParams(
        sender: Address,
        quote: Quote,
    ): Promise<AcrossTransferOpenParams> {
        const orderData = await encodeAbiParameters(ACROSS_ORDER_DATA_ABI, [
            {
                inputToken: quote.deposit.inputToken,
                inputAmount: quote.deposit.inputAmount,
                outputToken: quote.deposit.outputToken,
                outputAmount: quote.deposit.outputAmount,
                destinationChainId: quote.deposit.destinationChainId,
                recipient: quote.deposit.recipient,
                exclusiveRelayer: quote.deposit.exclusiveRelayer,
                exclusivityPeriod: quote.deposit.exclusivityDeadline,
                depositNonce: 0,
                message: "0x",
            },
        ]);

        const quoteResponse: AcrossTransferOpenParams = {
            action: "crossChainTransfer",
            params: {
                recipient: quote.deposit.recipient,
                inputChainId: quote.deposit.originChainId,
                outputChainId: quote.deposit.destinationChainId,
                inputTokenAddress: quote.deposit.inputToken,
                outputTokenAddress: quote.deposit.outputToken,
                sender,
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
                { publicClient: this.getPublicClient({ chain: inputChain }) },
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
        const openParams = await this.getAcrossOpenParams(params.sender, quote);
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
                    { publicClient: this.getPublicClient({ chain: inputChain }) },
                ),
                outputAmount: await formatTokenAmount(
                    {
                        amount: quote.deposit.outputAmount,
                        tokenAddress: quote.deposit.outputToken,
                        chain: outputChain,
                    },
                    { publicClient: this.getPublicClient({ chain: outputChain }) },
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
                owner: params.params.sender,
                spender: settlerContractAddress,
            },
            { publicClient: this.getPublicClient({ chain: inputChain }) },
        );

        if (currentAllowance >= inputAmount) {
            return result;
        }

        const approvalData = encodeFunctionData({
            abi: erc20Abi,
            functionName: "approve",
            args: [settlerContractAddress, inputAmount],
        });

        const allowanceTx = await this.getPublicClient({
            chain: inputChain,
        }).prepareTransactionRequest({
            account: params.params.sender,
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
        const { fillDeadline, orderDataType, orderData, inputChainId, sender } = params.params;
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

        const openTx = await this.getPublicClient({ chain: inputChain }).prepareTransactionRequest({
            account: sender,
            to: settlerContractAddress,
            data: openData,
            chain: inputChain,
            gas: ACROSS_OPEN_GAS_LIMIT,
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
