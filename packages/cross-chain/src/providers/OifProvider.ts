import { GetQuoteRequest, PostOrderResponse } from "@openintentsframework/oif-specs";
import { EIP1193Provider } from "viem";
import { ZodError } from "zod";

import {
    CrossChainProvider,
    ExecutableQuote,
    OifProviderConfig,
    OifProviderConfigSchema,
    ProviderConfigFailure,
    ProviderExecuteNotImplemented,
    ProviderGetQuoteFailure,
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
     * Get quotes for a cross-chain action from the OIF solver
     * @param params - The parameters for get quote request
     * @returns Array of executable quotes
     */
    async getQuotes(_params: GetQuoteRequest): Promise<ExecutableQuote[]> {
        // TODO: Implement quote fetching
        throw new ProviderGetQuoteFailure(
            "Not implemented",
            "OIF provider getQuotes not yet implemented",
        );
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
