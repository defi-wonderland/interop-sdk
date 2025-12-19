import { GetQuoteRequest, PostOrderResponse, Quote } from "@openintentsframework/oif-specs";
import { Address, Hex, PrepareTransactionRequestReturnType } from "viem";

import type { FillWatcherConfig } from "../services/EventBasedFillWatcher.js";
import { CrossChainProvider, ExecutableQuote, OpenedIntentParserConfig } from "../internal.js";
// TODO: REMOVE THIS IMPORT WHEN OIF-SPECS IS UPDATED WITH SCHEMAS
import { getQuoteRequestSchema } from "../schemas/oif.js";

interface SampleGetQuoteParams {
    input: {
        asset: string;
        amount: bigint;
    };
    output: string;
}

interface SampleGetQuoteResponse {
    input: {
        asset: string;
        amount: bigint;
    };
    output: string;
}

/**
 * A sample implementation of the CrossChainProvider interface.
 * This provider is used to demonstrate the functionality of the CrossChainProvider interface.
 */
export class SampleProvider extends CrossChainProvider {
    readonly protocolName = "sample";
    readonly providerId: string = "sample_id";

    constructor() {
        super();
    }

    async convertOifParamsToSampleParams(_params: GetQuoteRequest): Promise<SampleGetQuoteParams> {
        throw new Error("Not implemented");
    }

    async convertSampleResponseToOifResponse(_response: SampleGetQuoteResponse): Promise<Quote> {
        throw new Error("Not implemented");
    }

    async getSampleQuote(_params: SampleGetQuoteParams): Promise<SampleGetQuoteResponse> {
        throw new Error("Not implemented");
    }

    /**
     * @inheritdoc
     */
    async getQuotes(params: GetQuoteRequest): Promise<ExecutableQuote[]> {
        const parsedParams = getQuoteRequestSchema.parse(params);
        const sampleParams = await this.convertOifParamsToSampleParams(parsedParams);
        const sampleQuote = await this.getSampleQuote(sampleParams);
        const oifQuote = await this.convertSampleResponseToOifResponse(sampleQuote);
        const executableQuote: ExecutableQuote = {
            ...oifQuote,
            preparedTransaction: "0x" as unknown as PrepareTransactionRequestReturnType,
        };

        return [executableQuote];
    }

    /**
     * @inheritdoc
     */
    async submitSignedOrder(
        _quote: ExecutableQuote,
        _signature: Hex | Uint8Array,
    ): Promise<PostOrderResponse> {
        throw new Error("Not implemented");
    }

    /**
     * @inheritdoc
     *
     * This is a stub implementation for demonstration purposes.
     * Real providers should implement their protocol-specific tracking configuration.
     */
    getTrackingConfig(): {
        openedIntentParserConfig: OpenedIntentParserConfig;
        fillWatcherConfig: FillWatcherConfig;
    } {
        // Stub implementation - replace with actual protocol-specific configuration
        // Using OIF type means standard Open event parsing
        return {
            openedIntentParserConfig: { type: "oif" },
            fillWatcherConfig: {
                contractAddresses: {} as Record<number, Address>,
                eventAbi: [],
                buildLogsArgs: (): never => {
                    throw new Error("SampleProvider: tracking not implemented");
                },
                extractFillEvent: (): never => {
                    throw new Error("SampleProvider: tracking not implemented");
                },
            },
        };
    }
}
