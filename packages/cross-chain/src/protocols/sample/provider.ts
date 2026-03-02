import type { Address } from "viem";

import type { FillWatcherConfig } from "../../core/interfaces/fillWatcher.interface.js";
import type { Quote } from "../../core/schemas/quote.js";
import type { QuoteRequest } from "../../core/schemas/quoteRequest.js";
import { CrossChainProvider, OpenedIntentParserConfig } from "../../internal.js";

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

    async convertToSampleParams(_params: QuoteRequest): Promise<SampleGetQuoteParams> {
        throw new Error("Not implemented");
    }

    async convertSampleResponseToQuote(_response: SampleGetQuoteResponse): Promise<Quote> {
        throw new Error("Not implemented");
    }

    async getSampleQuote(_params: SampleGetQuoteParams): Promise<SampleGetQuoteResponse> {
        throw new Error("Not implemented");
    }

    /**
     * @inheritdoc
     */
    async getQuotes(params: QuoteRequest): Promise<Quote[]> {
        const sampleParams = await this.convertToSampleParams(params);
        const sampleQuote = await this.getSampleQuote(sampleParams);
        const quote = await this.convertSampleResponseToQuote(sampleQuote);
        return [quote];
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
                type: "event-based",
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
