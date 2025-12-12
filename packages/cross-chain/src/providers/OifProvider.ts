import {
    GetQuoteRequest,
    GetQuoteResponse,
    PostOrderResponse,
} from "@openintentsframework/oif-specs";
import axios, { AxiosError } from "axios";
import { bytesToHex, EIP1193Provider, Hex, PrepareTransactionRequestReturnType } from "viem";
import { ZodError } from "zod";

import {
    CrossChainProvider,
    ExecutableQuote,
    getQuoteResponseSchema,
    OifProviderConfig,
    OifProviderConfigSchema,
    ProviderConfigFailure,
    ProviderExecuteNotImplemented,
    ProviderGetQuoteFailure,
    Quote,
} from "../internal.js";

/**
 * OIF Provider implementation
 * @description Implements the CrossChainProvider interface to communicate with OIF-compliant solvers
 * via the standardized HTTP API defined in https://github.com/openintentsframework/oif-solver
 */
export class OifProvider extends CrossChainProvider {
    readonly protocolName = "oif";
    readonly providerId: string;

    private readonly solverId: string;
    private readonly url: string;
    private readonly headers?: Record<string, string>;
    private readonly adapterMetadata?: Record<string, unknown>;

    constructor(config: OifProviderConfig) {
        super();

        try {
            const configParsed = OifProviderConfigSchema.parse(config);
            this.solverId = configParsed.solverId;
            this.url = configParsed.url;
            this.headers = configParsed.headers;
            this.adapterMetadata = configParsed.adapterMetadata;
            this.providerId = configParsed.providerId ?? configParsed.solverId;
        } catch (error) {
            if (error instanceof ZodError) {
                throw new ProviderConfigFailure(
                    "Failed to parse OIF provider config",
                    error.message,
                    error.stack,
                );
            }
            throw new ProviderConfigFailure(
                "Failed to configure OIF provider",
                String(error),
                error instanceof Error ? error.stack : undefined,
            );
        }
    }

    /**
     * Prepare transaction for user-mode submission
     * @param quote - The quote containing order data
     * @returns Transaction request for user-open orders, undefined otherwise
     */
    private prepareTransaction(quote: Quote): PrepareTransactionRequestReturnType | undefined {
        try {
            if (quote.order.type !== "oif-user-open-v0") {
                return undefined;
            }

            return {
                to: quote.order.openIntentTx.to as Hex,
                data: bytesToHex(quote.order.openIntentTx.data),
            } as PrepareTransactionRequestReturnType;
        } catch {
            return undefined;
        }
    }

    /**
     * @inheritdoc
     */
    async getQuotes(params: GetQuoteRequest): Promise<ExecutableQuote[]> {
        try {
            const response = await axios.post<GetQuoteResponse>(`${this.url}/v1/quotes`, params, {
                headers: {
                    "Content-Type": "application/json",
                    ...this.headers,
                },
            });

            if (response.status !== 200) {
                throw new ProviderGetQuoteFailure(
                    "Failed to get OIF quotes",
                    `Unexpected status code: ${response.status}`,
                );
            }

            const validatedResponse = getQuoteResponseSchema.parse(response.data);

            const executableQuotes: ExecutableQuote[] = validatedResponse.quotes.map(
                (quote): ExecutableQuote => {
                    const preparedTransaction = this.prepareTransaction(quote);

                    return {
                        ...quote,
                        provider: quote.provider ?? this.solverId,
                        metadata: {
                            ...quote.metadata,
                            ...(this.adapterMetadata && { adapterMetadata: this.adapterMetadata }),
                        },
                        preparedTransaction,
                    };
                },
            );

            return executableQuotes;
        } catch (error) {
            if (error instanceof AxiosError) {
                const errorData = error.response?.data as { message?: string };
                const message =
                    errorData?.message ||
                    error.cause?.message ||
                    error.message ||
                    "Failed to get OIF quotes";

                throw new ProviderGetQuoteFailure(
                    "Failed to get OIF quotes from solver",
                    message,
                    error.stack,
                );
            } else if (error instanceof ZodError) {
                throw new ProviderGetQuoteFailure(
                    "Failed to validate OIF quote response",
                    error.message,
                    error.stack,
                );
            } else if (error instanceof ProviderGetQuoteFailure) {
                throw error;
            }

            throw new ProviderGetQuoteFailure(
                "Failed to get OIF quotes",
                String(error),
                error instanceof Error ? error.stack : undefined,
            );
        }
    }

    /**
     * Execute a quote by submitting it to the OIF solver
     * @param quote - The quote to execute
     * @param signer - The signer to use to sign the order
     * @returns The response from the solver
     */
    async execute(_quote: ExecutableQuote, _signer: EIP1193Provider): Promise<PostOrderResponse> {
        // TODO: Implement order execution
        throw new ProviderExecuteNotImplemented("OIF provider execute not yet implemented");
    }
}
