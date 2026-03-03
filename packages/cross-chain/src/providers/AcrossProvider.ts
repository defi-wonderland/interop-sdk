import { decodeAddress, encodeAddress } from "@wonderland/interop-addresses";
import axios, { AxiosError } from "axios";
import {
    AbiEvent,
    Address,
    Chain,
    Hex,
    Log,
    numberToHex,
    pad,
    PrepareTransactionRequestReturnType,
    PublicClient,
} from "viem";
import { ZodError } from "zod";

import type { Quote } from "../schemas/quote.js";
import type { QuoteRequest } from "../schemas/quoteRequest.js";
import { adaptQuote } from "../adapters/quoteAdapter.js";
import { adaptQuoteRequest } from "../adapters/quoteRequestAdapter.js";
import {
    ACROSS_FILLED_RELAY_EVENT_ABI,
    ACROSS_SPOKE_POOL_ADDRESSES,
    ACROSS_TESTNET_TOKENS,
    ACROSS_UNSUPPORTED_CHAIN_IDS,
    ACROSS_V3_FUNDS_DEPOSITED_SIGNATURE,
    AcrossConfigs,
    AcrossConfigSchema,
    AcrossDepositStatusResponse,
    AcrossGetQuoteParams,
    AcrossGetQuoteParamsSchema,
    AcrossGetQuoteResponse,
    AcrossGetQuoteResponseSchema,
    AcrossMetadata,
    AcrossOIFGetQuoteParams,
    AcrossOIFGetQuoteParamsSchema,
    AcrossToken,
    acrossTokensResponseSchema,
    APIBasedFillWatcherConfig,
    AssetDiscoveryConfig,
    AssetInfo,
    bytes32ToAddress,
    CrossChainProvider,
    CustomEventOpenedIntentParserConfig,
    EventBasedFillWatcherConfig,
    FillEvent,
    FillWatcherConfig,
    getAcrossApiUrl,
    getChainById,
    GetFillParams,
    InvalidOpenEventError,
    NetworkAssets,
    OpenedIntent,
    OpenedIntentParserConfig,
    OrderFailureReason,
    OrderStatus,
    parseAbiEncodedFields,
    ProviderConfigFailure,
    ProviderGetQuoteFailure,
    ProviderQuote,
    PublicClientManager,
} from "../internal.js";

/**
 * An implementation of the CrossChainProvider interface for the Across protocol
 * @see https://docs.across.to/
 * @param config - The configuration for the provider
 * @param dependencies - The dependencies for the provider
 * @returns A provider for the Across protocol
 */
export class AcrossProvider extends CrossChainProvider {
    static readonly PROTOCOL_NAME = "across" as const;

    readonly protocolName = AcrossProvider.PROTOCOL_NAME;
    readonly providerId: string;
    private readonly apiUrl: string;
    private readonly isTestnet: boolean;
    private readonly clientManager = new PublicClientManager();

    constructor(config: AcrossConfigs) {
        super();

        try {
            const configParsed = AcrossConfigSchema.parse(config);
            this.isTestnet = configParsed.isTestnet ?? false;
            this.apiUrl = configParsed.apiUrl || getAcrossApiUrl(this.isTestnet);
            this.providerId = configParsed.providerId;
        } catch (error) {
            if (error instanceof ZodError) {
                throw new ProviderConfigFailure(
                    "Failed to parse Across config",
                    error.message,
                    error.stack,
                );
            }
            throw new ProviderConfigFailure(
                "Failed to configure Across provider",
                String(error),
                error instanceof Error ? error.stack : undefined,
            );
        }
    }

    private getPublicClient(chain: Chain): PublicClient {
        return this.clientManager.getClient(chain);
    }

    /**
     * Parse an interop address to a viem address and chain id
     * @param address - The binary interop address (hex string) to parse
     * @returns The viem address and chain id
     */
    private parseInteropAddress(address: string): { address: Address; chain: number } {
        const decoded = decodeAddress(address as Hex);
        if (!decoded.address) {
            throw new Error("Address field is required");
        }
        if (!decoded.chainReference) {
            throw new Error("Chain reference is required");
        }
        return {
            address: decoded.address as Address,
            chain: Number(decoded.chainReference),
        };
    }

    /**
     * Generate an interop address from a viem address and chain id
     * @param address - The viem address
     * @param chain - The chain id
     * @returns The interop address
     */
    private generateInteropAddress(address: Address, chain: number): string {
        return encodeAddress(
            {
                version: 1,
                chainType: "eip155",
                chainReference: chain.toString(),
                address,
            },
            { format: "hex" },
        ) as string;
    }

    /**
     * Get a quote for an Across cross-chain transfer calling to the Across API
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
                    (error.cause as Error | undefined)?.message ||
                    error.message ||
                    "Failed to get Across quote";

                throw new ProviderGetQuoteFailure(
                    "Failed to get Across quote",
                    message,
                    error.stack,
                );
            } else if (error instanceof ZodError) {
                throw new ProviderGetQuoteFailure(
                    "Failed to parse Across quote",
                    error.message,
                    error.stack,
                );
            }
            throw new ProviderGetQuoteFailure(
                "Failed to get Across quote",
                String(error),
                error instanceof Error ? error.stack : undefined,
            );
        }
    }

    private async convertOifParamsToAcrossParams(
        params: AcrossOIFGetQuoteParams,
    ): Promise<AcrossGetQuoteParams> {
        try {
            const userParsed = this.parseInteropAddress(params.user);

            const { inputs, outputs } = params.intent;
            const inputParsed = this.parseInteropAddress(inputs[0].asset);
            const outputParsed = this.parseInteropAddress(outputs[0].asset);
            const recipientParsed = this.parseInteropAddress(outputs[0].receiver);
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
                recipient: recipientParsed.address,
            });
        } catch (error) {
            if (error instanceof ZodError) {
                throw new ProviderGetQuoteFailure(
                    "Failed to parse Across OIF quote request",
                    error.message,
                    error.stack,
                );
            }
            throw new ProviderGetQuoteFailure(
                "Failed to convert Across OIF quote request to Across params",
                String(error),
                error instanceof Error ? error.stack : undefined,
            );
        }
    }

    private async convertAcrossSwapToOifQuote(
        request: AcrossOIFGetQuoteParams,
        response: AcrossGetQuoteResponse,
    ): Promise<Omit<ProviderQuote, "preparedTransaction">> {
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
            failureHandling: "refund-automatic",
            metadata: {
                acrossResponse: response,
            },
        };
    }

    /**
     * Prepare the transaction using the swapTx from the Across API
     */
    private async prepareTransaction(
        quote: AcrossGetQuoteResponse,
    ): Promise<PrepareTransactionRequestReturnType | undefined> {
        try {
            const chain = getChainById(quote.swapTx.chainId);
            const publicClient = this.getPublicClient(chain);
            const preparedTransaction = await publicClient.prepareTransactionRequest({
                to: quote.swapTx.to,
                data: quote.swapTx.data,
                chain,
            });

            return preparedTransaction;
        } catch {
            return undefined;
        }
    }

    /**
     * @inheritdoc
     *
     * Accepts SDK QuoteRequest, converts internally to OIF wire format
     * for backward-compatible Across API integration.
     */
    async getQuotes(params: QuoteRequest): Promise<Quote[]> {
        try {
            // Convert SDK QuoteRequest → OIF GetQuoteRequest for existing Across logic
            const oifRequest = adaptQuoteRequest(params);
            const parsedParams = AcrossOIFGetQuoteParamsSchema.parse(oifRequest);

            const acrossGetQuote = await this.convertOifParamsToAcrossParams(parsedParams);
            const acrossQuote = await this.getAcrossQuote(acrossGetQuote);
            const oifQuote = await this.convertAcrossSwapToOifQuote(parsedParams, acrossQuote);

            const preparedTransaction = await this.prepareTransaction(acrossQuote);

            const providerQuote: ProviderQuote = {
                ...oifQuote,
                preparedTransaction,
            };

            const sdkQuote = adaptQuote(providerQuote);
            sdkQuote.metadata = {
                ...sdkQuote.metadata,
                _acrossProviderQuote: providerQuote,
            };
            return [sdkQuote];
        } catch (error) {
            if (error instanceof ZodError) {
                throw new ProviderGetQuoteFailure(
                    "Failed to parse Across OIF quote request",
                    error.message,
                    error.stack,
                );
            }
            throw new ProviderGetQuoteFailure(
                "Failed to get Across quotes",
                String(error),
                error instanceof Error ? error.stack : undefined,
            );
        }
    }

    /**
     * Get the opened intent parser configuration for Across
     * Parses the V3FundsDeposited event from SpokePool to extract all tracking data
     * and construct an ERC-7683 compliant ResolvedCrossChainOrder structure
     */
    static getOpenedIntentParserConfig(): CustomEventOpenedIntentParserConfig {
        return {
            protocolName: AcrossProvider.PROTOCOL_NAME,
            eventSignature: ACROSS_V3_FUNDS_DEPOSITED_SIGNATURE,
            extractOpenedIntent: (
                log: Log,
                txHash: Hex,
                blockNumber: bigint,
                originChainId: number,
            ): OpenedIntent => {
                // V3FundsDeposited event topics:
                // topic[0]: event signature
                // topic[1]: destinationChainId (indexed)
                // topic[2]: depositId (indexed)
                // topic[3]: depositor (indexed)
                const destinationChainIdTopic = log.topics[1];
                const depositIdTopic = log.topics[2];
                const depositorTopic = log.topics[3];

                if (!destinationChainIdTopic) {
                    throw new InvalidOpenEventError(
                        "Missing destinationChainId in V3FundsDeposited event",
                    );
                }
                if (!depositIdTopic) {
                    throw new InvalidOpenEventError("Missing depositId in V3FundsDeposited event");
                }
                if (!depositorTopic) {
                    throw new InvalidOpenEventError("Missing depositor in V3FundsDeposited event");
                }

                const destinationChainId = BigInt(destinationChainIdTopic);
                const depositId = BigInt(depositIdTopic);
                const depositor = ("0x" + depositorTopic.slice(-40)) as Address;

                // Parse non-indexed fields from data
                // Data layout: inputToken, outputToken, inputAmount, outputAmount,
                // quoteTimestamp, fillDeadline, exclusivityDeadline, recipient, exclusiveRelayer, message
                const fieldIndices = [0, 1, 2, 3, 5, 6, 7]; // inputToken, outputToken, inputAmount, outputAmount, fillDeadline, exclusivityDeadline, recipient
                const parsedFields = parseAbiEncodedFields(log.data, fieldIndices);
                const inputTokenBytes = parsedFields[0];
                const outputTokenBytes = parsedFields[1];
                const inputAmount = parsedFields[2];
                const outputAmount = parsedFields[3];
                const fillDeadlineBigInt = parsedFields[4];
                const exclusivityDeadlineBigInt = parsedFields[5];
                const recipientBytes = parsedFields[6];

                if (inputTokenBytes === undefined) {
                    throw new InvalidOpenEventError("Missing inputToken in V3FundsDeposited event");
                }
                if (outputTokenBytes === undefined) {
                    throw new InvalidOpenEventError(
                        "Missing outputToken in V3FundsDeposited event",
                    );
                }
                if (inputAmount === undefined) {
                    throw new InvalidOpenEventError(
                        "Missing inputAmount in V3FundsDeposited event",
                    );
                }
                if (outputAmount === undefined) {
                    throw new InvalidOpenEventError(
                        "Missing outputAmount in V3FundsDeposited event",
                    );
                }
                if (fillDeadlineBigInt === undefined) {
                    throw new InvalidOpenEventError(
                        "Missing fillDeadline in V3FundsDeposited event",
                    );
                }
                if (exclusivityDeadlineBigInt === undefined) {
                    throw new InvalidOpenEventError(
                        "Missing exclusivityDeadline in V3FundsDeposited event",
                    );
                }
                if (recipientBytes === undefined) {
                    throw new InvalidOpenEventError("Missing recipient in V3FundsDeposited event");
                }

                const fillDeadline = Number(fillDeadlineBigInt);
                const openDeadline = Number(exclusivityDeadlineBigInt); // Use exclusivity deadline as open deadline

                // Convert bytes32 addresses to proper Hex format
                // parseAbiEncodedFields returns bigint, so we need to convert to Hex first
                const inputToken = bytes32ToAddress(
                    pad(numberToHex(inputTokenBytes), { size: 32 }),
                );
                const outputToken = bytes32ToAddress(
                    pad(numberToHex(outputTokenBytes), { size: 32 }),
                );
                const recipient = bytes32ToAddress(pad(numberToHex(recipientBytes), { size: 32 }));

                // Create a unique orderId from depositId (ERC-7683 orderId is bytes32)
                const orderId = pad(numberToHex(depositId), { size: 32 });

                // Construct ERC-7683 ResolvedCrossChainOrder structure

                // maxSpent: What the user is spending on origin chain
                const maxSpent = [
                    {
                        token: inputToken,
                        amount: inputAmount,
                        recipient: log.address, // SpokePool receives the input
                        chainId: originChainId,
                    },
                ];

                // minReceived: What the user expects to receive on destination chain
                const minReceived = [
                    {
                        token: outputToken,
                        amount: outputAmount,
                        recipient,
                        chainId: Number(destinationChainId),
                    },
                ];

                // fillInstructions: How to fill on destination chain
                // Note: Across doesn't have a destination settler in the ERC-7683 sense
                // The SpokePool on destination chain handles fills
                const fillInstructions = [
                    {
                        destinationChainId: Number(destinationChainId),
                        destinationSettler:
                            "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex, // Placeholder
                        originData: "0x" as Hex, // No origin data for Across
                    },
                ];

                return {
                    // ERC-7683 ResolvedCrossChainOrder fields
                    user: depositor,
                    originChainId,
                    openDeadline,
                    fillDeadline,
                    orderId,
                    maxSpent,
                    minReceived,
                    fillInstructions,
                    // SDK metadata fields
                    txHash,
                    blockNumber,
                    originContract: log.address,
                };
            },
        };
    }

    /**
     * ALTERNATIVE: Get the fill watcher configuration for Across (ONCHAIN)
     * Parses FilledRelay events from SpokePool contracts
     * Used to configure a generic EventBasedFillWatcher
     *
     * @note This is an alternative approach. The default API-based method is recommended.
     */
    static getFillWatcherConfig(): EventBasedFillWatcherConfig {
        return {
            type: "event-based",
            contractAddresses: ACROSS_SPOKE_POOL_ADDRESSES,
            eventAbi: ACROSS_FILLED_RELAY_EVENT_ABI,
            buildLogsArgs: (
                params: GetFillParams,
                contractAddress: Address,
            ): { address: Address; event: AbiEvent; args?: Record<string, unknown> } => {
                // Convert orderId (Hex) to depositId (bigint) for Across event filtering
                // Across uses depositId in their V3FundsDeposited and FilledV3Relay events
                const depositId = BigInt(params.orderId);
                return {
                    address: contractAddress,
                    event: ACROSS_FILLED_RELAY_EVENT_ABI[0]!,
                    args: {
                        originChainId: BigInt(params.originChainId),
                        depositId,
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
                    orderId: params.orderId,
                    relayer: bytes32ToAddress(args.relayer),
                    recipient: bytes32ToAddress(args.recipient),
                };
            },
        };
    }

    /**
     * Get API-based fill watcher config for Across (default)
     * Uses Across API to track deposit status
     *
     * @param isTestnet - Whether to use the testnet API (default: false for mainnet)
     * @see https://docs.across.to/reference/api-reference#get-deposit-status
     */
    static getFillWatcherConfigAPI(
        isTestnet: boolean = false,
    ): APIBasedFillWatcherConfig<AcrossDepositStatusResponse, AcrossMetadata> {
        return {
            type: "api-based",
            baseUrl: getAcrossApiUrl(isTestnet),
            pollingInterval: 12000, // Poll every 12 seconds (API has 10s indexing cadence + buffer)
            retry: {
                maxAttempts: 3,
                initialDelay: 2000,
                maxDelay: 15000,
                backoffMultiplier: 2,
            },
            buildEndpoint: (params): string => {
                // Across only supports user-open orders, so openTxHash is always available
                if (!params.openTxHash) {
                    throw new Error("Across requires openTxHash for tracking");
                }
                // Across API uses depositTxnRef (origin transaction hash)
                return `/deposit/status?depositTxnRef=${params.openTxHash}`;
            },
            extractFillEvent: (
                response,
                params,
            ): {
                event: FillEvent | null;
                status: OrderStatus;
                failureReason?: OrderFailureReason;
                metadata?: AcrossMetadata;
            } => {
                // Map Across API status to OrderStatus and failureReason
                let status: OrderStatus;
                let failureReason: OrderFailureReason | undefined;

                switch (response.status) {
                    case "filled":
                        status = OrderStatus.Finalized;
                        break;
                    case "expired":
                        status = OrderStatus.Failed;
                        failureReason = OrderFailureReason.DeadlineExceeded;
                        break;
                    case "refunded":
                        status = OrderStatus.Refunded;
                        break;
                    case "pending":
                    case "slowFillRequested":
                    default:
                        status = OrderStatus.Pending;
                        break;
                }

                // Only extract fill event when status is "filled" and fillTxnRef is present
                if (response.status !== "filled" || !response.fillTxnRef) {
                    return { event: null, status, failureReason };
                }

                // Note: Across API doesn't provide all fill details
                // Some fields will have placeholder values
                const event: FillEvent = {
                    fillTxHash: response.fillTxnRef as Hex,
                    blockNumber: 0n, // API doesn't provide block number
                    timestamp: 0, // API doesn't provide timestamp
                    originChainId: params.originChainId,
                    orderId: params.orderId,
                    relayer: "0x0000000000000000000000000000000000000000" as Address, // API doesn't provide
                    recipient: "0x0000000000000000000000000000000000000000" as Address, // API doesn't provide
                };

                const metadata: AcrossMetadata = {
                    actionsSucceeded: response.actionsSucceeded,
                };

                return { event, status, failureReason, metadata };
            },
        };
    }

    /**
     * @inheritdoc
     * Returns API-based tracking for mainnet, event-based for testnet
     * (Across testnet API is not reliable)
     */
    getTrackingConfig(): {
        openedIntentParserConfig: OpenedIntentParserConfig;
        fillWatcherConfig: FillWatcherConfig;
    } {
        // Use event-based tracking for testnet (API not reliable)
        // Use API-based tracking for mainnet
        const fillWatcherConfig: FillWatcherConfig = this.isTestnet
            ? AcrossProvider.getFillWatcherConfig()
            : (AcrossProvider.getFillWatcherConfigAPI() as FillWatcherConfig);

        return {
            openedIntentParserConfig: {
                type: "custom-event",
                config: AcrossProvider.getOpenedIntentParserConfig(),
            },
            fillWatcherConfig,
        };
    }

    override getDiscoveryConfig(): AssetDiscoveryConfig {
        if (this.isTestnet) {
            return {
                type: "static",
                config: { networks: ACROSS_TESTNET_TOKENS },
            };
        }

        return {
            type: "custom-api",
            config: {
                assetsEndpoint: `${this.apiUrl}/swap/tokens`,
                parseResponse: AcrossProvider.parseTokensResponse,
            },
        };
    }

    private static parseTokensResponse(data: unknown): NetworkAssets[] {
        const tokens = acrossTokensResponseSchema.parse(data);
        return AcrossProvider.groupTokensByChain(tokens);
    }

    private static groupTokensByChain(tokens: AcrossToken[]): NetworkAssets[] {
        const chainMap = new Map<number, Map<string, AssetInfo>>();

        for (const token of tokens) {
            if (ACROSS_UNSUPPORTED_CHAIN_IDS.has(token.chainId)) {
                continue;
            }

            const encoded = encodeAddress(
                {
                    version: 1,
                    chainType: "eip155",
                    chainReference: token.chainId.toString(),
                    address: token.address as Address,
                },
                { format: "hex" },
            );

            const asset: AssetInfo = {
                address: encoded as Address,
                symbol: token.symbol,
                decimals: token.decimals,
            };

            if (!chainMap.has(token.chainId)) {
                chainMap.set(token.chainId, new Map());
            }

            const chainAssets = chainMap.get(token.chainId)!;
            const normalizedAddress = token.address.toLowerCase();
            if (!chainAssets.has(normalizedAddress)) {
                chainAssets.set(normalizedAddress, asset);
            }
        }

        return Array.from(chainMap.entries()).map(([chainId, assetsMap]) => ({
            chainId,
            assets: Array.from(assetsMap.values()),
        }));
    }
}
