import { buildFromPayload, getAddress, getChainId } from "@wonderland/interop-addresses";
import { GetQuoteRequest, PostOrderResponse, Quote } from "@wonderland/interop-oif-specs";
import axios, { AxiosError } from "axios";
import {
    AbiEvent,
    Address,
    Chain,
    createPublicClient,
    EIP1193Provider,
    Hex,
    http,
    Log,
    PublicClient,
    toHex,
} from "viem";

import {
    ACROSS_FILLED_RELAY_EVENT_ABI,
    ACROSS_SPOKE_POOL_ADDRESSES,
    AcrossConfigs,
    AcrossConfigSchema,
    AcrossGetQuoteParams,
    AcrossGetQuoteParamsSchema,
    AcrossGetQuoteResponse,
    AcrossGetQuoteResponseSchema,
    AcrossOIFGetQuoteParams,
    AcrossOIFGetQuoteParamsSchema,
    bytes32ToAddress,
    CrossChainProvider,
    DepositInfo,
    DepositInfoParserConfig,
    ExecutableQuote,
    FillEvent,
    FillWatcherConfig,
    getChainById,
    GetFillParams,
    parseAbiEncodedFields,
    ProviderExecuteNotImplemented,
    ProviderGetQuoteFailure,
} from "../internal.js";

/**
 * An implementation of the CrossChainProvider interface for the Across protocol
 * @see https://docs.across.to/
 * @param config - The configuration for the provider
 * @param dependencies - The dependencies for the provider
 * @returns A provider for the Across protocol
 */
export class AcrossProvider extends CrossChainProvider {
    readonly protocolName = "across";
    readonly providerId: string;
    private readonly apiUrl: string;
    private readonly rpcClientCache: Map<number, PublicClient> = new Map();

    constructor(config: AcrossConfigs) {
        super();

        const configParsed = AcrossConfigSchema.parse(config);
        this.apiUrl = configParsed.apiUrl;
        this.providerId = configParsed.providerId;
    }

    private async getPublicClient(chain: Chain): Promise<PublicClient> {
        if (this.rpcClientCache.has(chain.id)) {
            return this.rpcClientCache.get(chain.id)!;
        }

        const rpcClient = createPublicClient({
            chain,
            transport: http(),
        });

        this.rpcClientCache.set(chain.id, rpcClient);

        return rpcClient;
    }

    /**
     * Parse an interop address to a viem address and chain id
     * @param address - The interop address to parse
     * @returns The viem address and chain id
     */
    private async parseInteropAddress(
        address: string,
    ): Promise<{ address: Address; chain: number }> {
        return {
            address: (await getAddress(address)) as Address,
            chain: (await getChainId(address)) as number,
        };
    }

    /**
     * Generate an interop address from a viem address and chain id
     * @param address - The viem address
     * @param chain - The chain id
     * @returns The interop address
     */
    private generateInteropAddress(address: Address, chain: number): string {
        return buildFromPayload({
            version: 1,
            chainType: "eip155",
            chainReference: toHex(chain),
            address,
        });
    }

    /**
     * Get a quote for an Across cross-chain transfer calling to the Across SDK
     * @param params - The parameters for the action
     * @returns A quote for the action
     */
    private async getAcrossQuote(params: AcrossGetQuoteParams): Promise<AcrossGetQuoteResponse> {
        try {
            const response = await axios.get<AcrossGetQuoteResponse>(
                `${this.apiUrl}/swap/approval`,
                {
                    params,
                },
            );

            if (response.status !== 200) {
                throw new ProviderGetQuoteFailure("Failed to get Across quote");
            }

            return AcrossGetQuoteResponseSchema.parse(response.data);
        } catch (error) {
            if (error instanceof AxiosError) {
                const errorData = error.response?.data as { message: string };

                const message =
                    errorData.message ||
                    error.cause?.message ||
                    error.message ||
                    "Failed to get Across quote";
                throw new ProviderGetQuoteFailure(message);
            }
            throw error;
        }
    }

    private async convertOifParamsToAcrossParams(
        params: AcrossOIFGetQuoteParams,
    ): Promise<AcrossGetQuoteParams> {
        const userParsed = await this.parseInteropAddress(params.user);

        const { inputs, outputs } = params.intent;
        const inputParsed = await this.parseInteropAddress(inputs[0].asset);
        const outputParsed = await this.parseInteropAddress(outputs[0].asset);
        const swapType = params.intent.swapType || "exact-input";
        const amount = swapType === "exact-input" ? inputs[0].amount : outputs[0].amount;

        return AcrossGetQuoteParamsSchema.parse({
            tradeType: params.intent.swapType || "exact-input",
            inputToken: inputParsed.address,
            amount,
            outputToken: outputParsed.address,
            originChainId: inputParsed.chain,
            destinationChainId: outputParsed.chain,
            depositor: userParsed.address,
        });
    }

    private convertAcrossSwapToOifQuote(
        request: AcrossOIFGetQuoteParams,
        response: AcrossGetQuoteResponse,
    ): Quote {
        const { inputs, outputs } = request.intent;

        return {
            order: {
                type: "across",
                payload: response.swapTx,
                metadata: {},
            },
            preview: {
                inputs: [
                    {
                        user: inputs[0].user,
                        asset: this.generateInteropAddress(
                            response.inputToken.address,
                            response.inputToken.chainId,
                        ),
                        amount: response.inputAmount,
                    },
                ],
                outputs: [
                    {
                        receiver: outputs[0].receiver,
                        asset: this.generateInteropAddress(
                            response.outputToken.address,
                            response.outputToken.chainId,
                        ),
                        amount: response.expectedOutputAmount,
                    },
                ],
            },
            quoteId: response.id,
            eta: response.expectedFillTime,
            partialFill: false,
            metadata: {
                acrossResponse: response,
            },
        };
    }

    /**
     * @inheritdoc
     */
    async getQuotes(params: GetQuoteRequest): Promise<ExecutableQuote[]> {
        const parsedParams = AcrossOIFGetQuoteParamsSchema.parse(params);

        const acrossGetQuote = await this.convertOifParamsToAcrossParams(parsedParams);
        const acrossQuote = await this.getAcrossQuote(acrossGetQuote);
        const oifQuote = this.convertAcrossSwapToOifQuote(parsedParams, acrossQuote);

        const chain = getChainById(acrossQuote.swapTx.chainId);
        const publicClient = await this.getPublicClient(chain);
        const preparedTransaction = await publicClient.prepareTransactionRequest({
            to: acrossQuote.swapTx.to,
            data: acrossQuote.swapTx.data,
            chain,
        });

        const executableQuote: ExecutableQuote = {
            ...oifQuote,
            preparedTransaction,
            execute: (signer: EIP1193Provider) => this.execute(oifQuote, signer),
        };

        return [executableQuote];
    }

    /**
     * @inheritdoc
     */
    async execute(_quote: Quote, _signer: EIP1193Provider): Promise<PostOrderResponse> {
        throw new ProviderExecuteNotImplemented("Not implemented");
    }

    /**
     * Get the deposit info parser configuration for Across
     * Used to configure a generic EventBasedDepositInfoParser
     */
    static getDepositInfoParserConfig(): DepositInfoParserConfig {
        const FUNDS_DEPOSITED_SIGNATURE =
            "0x32ed1a409ef04c7b0227189c3a103dc5ac10e775a15b785dcc510201f7c25ad3" as Hex;

        return {
            protocolName: AcrossProvider.prototype.protocolName,
            eventSignature: FUNDS_DEPOSITED_SIGNATURE,
            extractDepositInfo: (log: Log): DepositInfo => {
                const destinationChainId = BigInt(log.topics[1] || "0");
                const depositId = BigInt(log.topics[2] || "0");

                const [inputAmount, outputAmount] = parseAbiEncodedFields(log.data, [2, 3]) as [
                    bigint,
                    bigint,
                ];

                return {
                    depositId,
                    inputAmount,
                    outputAmount,
                    destinationChainId,
                };
            },
        };
    }

    /**
     * Get the fill watcher configuration for Across
     * Used to configure a generic EventBasedFillWatcher
     */
    static getFillWatcherConfig(): FillWatcherConfig {
        return {
            contractAddresses: ACROSS_SPOKE_POOL_ADDRESSES,
            eventAbi: ACROSS_FILLED_RELAY_EVENT_ABI,
            buildLogsArgs: (
                params: GetFillParams,
                contractAddress: Address,
            ): { address: Address; event: AbiEvent; args?: Record<string, unknown> } => {
                return {
                    address: contractAddress,
                    event: ACROSS_FILLED_RELAY_EVENT_ABI[0]!,
                    args: {
                        originChainId: BigInt(params.originChainId),
                        depositId: params.depositId,
                    },
                };
            },
            extractFillEvent: (log: Log, params: GetFillParams): FillEvent | null => {
                if (!log.transactionHash) {
                    return null;
                }

                const args = (log as unknown as { args?: { relayer: Hex; recipient: Hex } }).args;

                if (!args) {
                    return null;
                }

                return {
                    fillTxHash: log.transactionHash,
                    blockNumber: log.blockNumber || 0n,
                    timestamp: 0, // Will be populated by the watcher
                    originChainId: params.originChainId,
                    depositId: params.depositId,
                    relayer: bytes32ToAddress(args.relayer),
                    recipient: bytes32ToAddress(args.recipient),
                };
            },
        };
    }
}
