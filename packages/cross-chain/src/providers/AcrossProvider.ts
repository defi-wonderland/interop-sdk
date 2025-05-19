import { getQuote, Quote } from "@across-protocol/app-sdk";
import {
    Address,
    encodeAbiParameters,
    encodeFunctionData,
    erc20Abi,
    isHex,
    parseUnits,
    PublicClient,
    TransactionRequest,
} from "viem";
import { z } from "zod";

import {
    ACROSS_DEPOSIT_ABI,
    ACROSS_ORDER_DATA_TYPE,
    ACROSS_SETTLER_CONTRACT_ADDRESSES,
    ACROSS_TESTING_API_URL,
    CrossChainProvider,
    Fee,
    GetQuoteParams,
    GetQuoteResponse,
    OPEN_ABI,
    TransferGetQuoteParams,
    TransferGetQuoteParamsSchema,
    TransferGetQuoteResponse,
} from "../internal.js";

const AcrossTransferOpenParamsSchema = z.object({
    action: z.literal("crossChainTransfer"),
    params: z.object({
        inputChainId: z.number(),
        outputChainId: z.number(),
        inputTokenAddress: z.string(),
        outputTokenAddress: z.string(),
        inputAmount: z.string(),
        fillDeadline: z.number(),
        orderDataType: z.string().refine((val) => isHex(val), {
            message: "Invalid order data type",
        }),
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

export class AcrossProvider extends CrossChainProvider<AcrossOpenParams> {
    private readonly protocolName = "across";
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
            inputToken: params.inputTokenAddress as `0x${string}`,
            outputToken: params.outputTokenAddress as `0x${string}`,
        };

        return await getQuote({
            route,
            inputAmount: params.inputAmount,
            apiUrl: ACROSS_TESTING_API_URL,
        });
    }

    // Function to pad the depositor address
    private padAddress(address: string): string {
        return "0x000000000000000000000000" + address.slice(2);
    }

    /**
     * Get the open parameters for an Across cross-chain transfer
     * @param quote - The quote to get the open parameters for
     * @returns The open parameters
     */
    private async getAcrossOpenParams(quote: Quote): Promise<AcrossTransferOpenParams> {
        const orderData = encodeAbiParameters(ACROSS_DEPOSIT_ABI, [
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
                inputAmount: quote.deposit.inputAmount.toString(),
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
    private async calculateTotalFee(quote: Quote): Promise<number> {
        return Object.values(quote.fees).reduce((acc, fee) => acc + Number(fee.total), 0);
    }

    /**
     * Calculate the percent fee for an Across quote
     * @param quote - The quote to calculate the fee for
     * @returns The percent fee
     */
    private async calculatePercentFee(quote: Quote): Promise<number> {
        return Object.values(quote.fees).reduce((acc, fee) => acc + Number(fee.pct), 0);
    }

    /**
     * Calculate the total and percent fees for an Across quote
     * @param quote - The quote to calculate the fees for
     * @returns The total and percent fees
     */
    private async calculateFee(quote: Quote): Promise<Fee> {
        const totalFee = await this.calculateTotalFee(quote);
        const percentFee = await this.calculatePercentFee(quote);
        return {
            total: totalFee.toString(),
            percent: percentFee.toString(),
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
                inputAmount: quote.deposit.inputAmount.toString(),
                outputAmount: quote.deposit.outputAmount.toString(),
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
                throw new Error(`Unsupported action: ${action}`);
        }
    }

    private async getSettlerAllowanceTransaction(
        params: AcrossTransferOpenParams,
    ): Promise<TransactionRequest[]> {
        const { inputChainId, inputTokenAddress } = params.params;

        const result: TransactionRequest[] = [];

        const settlerContractAddress = ACROSS_SETTLER_CONTRACT_ADDRESSES[Number(inputChainId)];

        if (!settlerContractAddress) {
            throw new Error("Non-supported chain id");
        }

        const currentAllowance = await this.publicClient.readContract({
            address: inputTokenAddress as `0x${string}`,
            abi: erc20Abi,
            functionName: "allowance",
            args: [this.userAddress, settlerContractAddress],
        });

        const tokenDecimals = await this.publicClient.readContract({
            address: inputTokenAddress as `0x${string}`,
            abi: erc20Abi,
            functionName: "decimals",
        });

        const parseInputAmount = parseUnits(params.params.inputAmount, tokenDecimals);

        if (currentAllowance >= parseInputAmount) {
            return result;
        }

        const approvalData = encodeFunctionData({
            abi: erc20Abi,
            functionName: "approve",
            args: [settlerContractAddress, parseInputAmount],
        });

        const allowanceTx = await this.publicClient.prepareTransactionRequest({
            account: this.userAddress as `0x${string}`,
            to: inputTokenAddress as `0x${string}`,
            data: approvalData,
            chain: this.publicClient.chain,
        });

        return [allowanceTx];
    }

    private async simulateTransferOpen(
        params: AcrossTransferOpenParams,
    ): Promise<TransactionRequest[]> {
        const { fillDeadline, orderDataType, orderData, inputChainId } = params.params;
        const result: TransactionRequest[] = [];

        if (!(Number(inputChainId) in ACROSS_SETTLER_CONTRACT_ADDRESSES)) {
            throw new Error("Non-supported chain id");
        }

        const settlerContractAddress = ACROSS_SETTLER_CONTRACT_ADDRESSES[Number(inputChainId)];

        const allowanceTx = await this.getSettlerAllowanceTransaction(params);

        result.push(...allowanceTx);

        const openData = encodeFunctionData({
            abi: OPEN_ABI,
            functionName: "open",
            args: [{ fillDeadline, orderDataType, orderData }],
        });

        const openTx = await this.publicClient.prepareTransactionRequest({
            account: this.userAddress as `0x${string}`,
            to: settlerContractAddress as `0x${string}`,
            data: openData,
            chain: this.publicClient.chain,
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
                throw new Error("Not implemented");
        }
    }
}
