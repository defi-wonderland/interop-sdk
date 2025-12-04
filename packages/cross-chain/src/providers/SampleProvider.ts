import {
    GetQuoteRequest,
    getQuoteRequestSchema,
    PostOrderResponse,
    Quote,
} from "@wonderland/interop-oif-specs";
import { EIP1193Provider, PrepareTransactionRequestReturnType } from "viem";

import { CrossChainProvider, ExecutableQuote } from "../internal.js";

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

    async execute(_quote: ExecutableQuote, _signer: EIP1193Provider): Promise<PostOrderResponse> {
        throw new Error("Not implemented");
    }
}
