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
    ACROSS_ORDER_DATA_ABI,
    ACROSS_ORDER_DATA_TYPE,
    ACROSS_TESTING_API_URL,
    AcrossConfigs,
    AcrossOpenParams,
    AcrossOpenParamsSchema,
    AcrossStrategyMap,
    AcrossSwapMessageBuilder,
    AcrossTransferOpenParams,
    CrossChainProvider,
    Fee,
    formatTokenAmount,
    getAcrossStrategy,
    GetQuoteParams,
    GetQuoteResponse,
    getTokenAllowance,
    parseTokenAmount,
    SUPPORTED_CHAINS,
    SwapGetQuoteParams,
    TransferGetQuoteParams,
    UnsupportedChainId,
    ValidActions,
} from "../../internal.js";

/**
 * An implementation of the CrossChainProvider interface for the Across protocol
 * @see https://docs.across.to/
 * @param config - The configuration for the provider
 * @param dependencies - The dependencies for the provider
 * @returns A provider for the Across protocol
 */
export class AcrossProvider extends CrossChainProvider<AcrossOpenParams<ValidActions>> {
    readonly protocolName: string;
    readonly swapProtocol?: AcrossSwapMessageBuilder;
    private readonly clientCache: Map<number, PublicClient> = new Map();

    constructor(config?: AcrossConfigs) {
        super();
        this.swapProtocol = config?.swapProtocol;
        this.protocolName = "across" + (this.swapProtocol ? `_${this.swapProtocol}` : "");
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
    private async getAcrossQuote(
        action: ValidActions,
        params: TransferGetQuoteParams | SwapGetQuoteParams,
    ): Promise<Quote> {
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

        let message: Hex = "0x";
        if (action === "crossChainSwap") {
            message = this.swapProtocol!.buildAcrossMessage(params as SwapGetQuoteParams);
        }

        return await getQuote({
            route,
            inputAmount,
            apiUrl: ACROSS_TESTING_API_URL,
            recipient: params.recipient,
            crossChainMessage: message === "0x" ? undefined : message,
        });
    }

    /**
     * Pad the depositor address
     * @param address - The address to pad
     * @returns The padded address
     */
    private padAddress(address: Hex): Hex {
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
                recipient: this.padAddress(quote.deposit.recipient),
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
     * Get a chain from the supported chains
     * @param chainId - The chain id
     * @returns The chain
     * @throws UnsupportedChainId if the chain is not supported
     */
    private getChain(chainId: number): Chain {
        const chain = SUPPORTED_CHAINS.find((chain) => chain.id === chainId);
        if (!chain) {
            throw new UnsupportedChainId(chainId);
        }
        return chain;
    }

    /**
     * @inheritdoc
     */
    async getQuote<Action extends keyof AcrossStrategyMap>(
        action: Action,
        input: GetQuoteParams<Action>,
    ): Promise<GetQuoteResponse<Action, AcrossOpenParams<Action>>> {
        const strategy = getAcrossStrategy(action);
        const params = strategy.parseGetQuoteParams(input);

        const acrossQuote = await this.getAcrossQuote(action, params);

        const inputChain = this.getChain(Number(params.inputChainId));

        const context = {
            publicClient: this.getPublicClient({ chain: inputChain }),
            acrossQuote,
            acrossOpenParams: await this.getAcrossOpenParams(params.sender, acrossQuote),
            protocolName: this.protocolName,
            fee: await this.calculateFee(acrossQuote),
            swapProtocol: this.swapProtocol,
        };

        const quote = await strategy.quote(context, params);
        return quote as GetQuoteResponse<Action, AcrossOpenParams<Action>>;
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
     * @inheritdoc
     */
    validateOpenParams(params: AcrossOpenParams<ValidActions>): void {
        AcrossOpenParamsSchema.parse(params);
    }

    /**
     * @inheritdoc
     */
    async validatedSimulateOpen(
        params: AcrossOpenParams<ValidActions>,
    ): Promise<TransactionRequest[]> {
        const strategy = getAcrossStrategy(params.action);

        const inputChain = this.getChain(Number(params.params.inputChainId));
        const allowanceTx = await this.getAllowanceTransaction(params);

        const context = {
            publicClient: this.getPublicClient({ chain: inputChain }),
            allowanceTx,
            swapProtocol: this.swapProtocol,
        };

        return await strategy.simulate(context, params);
    }

    /**
     * Get the allowance transaction based on the action type
     * @param params - The parameters for the action
     * @returns The allowance transaction
     */
    private async getAllowanceTransaction(
        params: AcrossOpenParams<ValidActions>,
    ): Promise<TransactionRequest[]> {
        return params.action === "crossChainTransfer"
            ? await this.getSettlerAllowanceTransaction(params)
            : [];
    }
}
