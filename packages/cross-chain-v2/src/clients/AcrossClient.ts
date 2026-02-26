import type {
    AcrossDepositStatusResponse,
    AcrossGetQuoteParams,
    AcrossGetQuoteResponse,
} from "@wonderland/interop-cross-chain";
import {
    AcrossGetQuoteResponseSchema,
    getAcrossApiUrl,
    ProviderGetQuoteFailure,
} from "@wonderland/interop-cross-chain";
import axios, { AxiosError } from "axios";
import { ZodError } from "zod";

export interface AcrossClientConfig {
    apiUrl?: string;
    isTestnet?: boolean;
}

export class AcrossClient {
    readonly apiUrl: string;
    readonly isTestnet: boolean;

    constructor(config: AcrossClientConfig = {}) {
        this.isTestnet = config.isTestnet ?? false;
        this.apiUrl = config.apiUrl ?? getAcrossApiUrl(this.isTestnet);
    }

    async getSwapQuote(params: AcrossGetQuoteParams): Promise<AcrossGetQuoteResponse> {
        try {
            const response = await axios.get<AcrossGetQuoteResponse>(
                `${this.apiUrl}/swap/approval`,
                { params },
            );

            if (response.status !== 200) {
                throw new ProviderGetQuoteFailure("Failed to get Across quote");
            }

            return AcrossGetQuoteResponseSchema.parse(response.data);
        } catch (error) {
            if (error instanceof ProviderGetQuoteFailure) throw error;
            if (error instanceof AxiosError) {
                const msg =
                    (error.response?.data as { message?: string })?.message ?? error.message;
                throw new ProviderGetQuoteFailure("Failed to get Across quote", msg, error.stack);
            }
            if (error instanceof ZodError) {
                throw new ProviderGetQuoteFailure(
                    "Failed to parse Across quote",
                    error.message,
                    error.stack,
                );
            }
            throw new ProviderGetQuoteFailure("Failed to get Across quote", String(error));
        }
    }

    async getDepositStatus(depositTxRef: string): Promise<AcrossDepositStatusResponse> {
        const response = await axios.get<AcrossDepositStatusResponse>(
            `${this.apiUrl}/deposit/status`,
            { params: { depositTxnRef: depositTxRef } },
        );
        return response.data;
    }
}
