import { ProviderGetQuoteFailure } from "@wonderland/interop-cross-chain";
import axios, { AxiosError } from "axios";

const RELAY_MAINNET_API = "https://api.relay.link";
const RELAY_TESTNET_API = "https://api.testnets.relay.link";

// ──── Quote request/response ────

export interface RelayQuoteRequest {
    user: string;
    originChainId: number;
    destinationChainId: number;
    originCurrency: string;
    destinationCurrency: string;
    amount: string;
    tradeType: "EXACT_INPUT" | "EXACT_OUTPUT";
    recipient?: string;
    referrer?: string;
}

export interface RelayStepItemData {
    from: string;
    to: string;
    data: string;
    value: string;
    chainId: number;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
    gas?: string;
}

export interface RelayStepItem {
    status: string;
    data: RelayStepItemData;
    check?: { endpoint: string; method: string };
}

export interface RelayStep {
    id: string;
    action: string;
    description: string;
    kind: "transaction" | "signature";
    requestId: string;
    items: RelayStepItem[];
    depositAddress?: string;
}

export interface RelayCurrency {
    chainId: number;
    address: string;
    symbol: string;
    name: string;
    decimals: number;
}

export interface RelayFeeComponent {
    currency: RelayCurrency;
    amount: string;
    amountFormatted: string;
    amountUsd: string;
}

export interface RelayQuoteDetails {
    operation: string;
    sender: string;
    recipient: string;
    timeEstimate: number;
    currencyIn: { amount: string; currency: RelayCurrency };
    currencyOut: { amount: string; currency: RelayCurrency };
    totalImpact?: { usd: string; percent: string };
    rate?: string;
}

export interface RelayQuoteResponse {
    steps: RelayStep[];
    fees?: {
        gas?: RelayFeeComponent;
        relayer?: RelayFeeComponent;
    };
    details?: RelayQuoteDetails;
}

// ──── Status ────

export type RelayIntentStatus =
    | "waiting"
    | "pending"
    | "submitted"
    | "success"
    | "delayed"
    | "refunded"
    | "failure";

export interface RelayStatusResponse {
    status: RelayIntentStatus;
    inTxHashes?: string[];
    txHashes?: string[];
    updatedAt?: number;
    originChainId?: number;
    destinationChainId?: number;
}

// ──── Client ────

export interface RelayClientConfig {
    apiUrl?: string;
    apiKey?: string;
    isTestnet?: boolean;
}

export class RelayClient {
    private static readonly TIMEOUT_MS = 30_000;

    readonly apiUrl: string;
    readonly apiKey?: string;

    constructor(config: RelayClientConfig = {}) {
        this.apiKey = config.apiKey;
        this.apiUrl = config.apiUrl ?? (config.isTestnet ? RELAY_TESTNET_API : RELAY_MAINNET_API);
    }

    async getQuote(params: RelayQuoteRequest): Promise<RelayQuoteResponse> {
        try {
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (this.apiKey) headers["x-api-key"] = this.apiKey;

            const response = await axios.post<RelayQuoteResponse>(
                `${this.apiUrl}/quote/v2`,
                params,
                { headers, timeout: RelayClient.TIMEOUT_MS },
            );

            if (response.status !== 200) {
                throw new ProviderGetQuoteFailure("Failed to get Relay quote");
            }

            return response.data;
        } catch (error) {
            if (error instanceof ProviderGetQuoteFailure) throw error;
            if (error instanceof AxiosError) {
                const msg =
                    (error.response?.data as { message?: string })?.message ?? error.message;
                throw new ProviderGetQuoteFailure("Failed to get Relay quote", msg, error.stack);
            }
            throw new ProviderGetQuoteFailure("Failed to get Relay quote", String(error));
        }
    }

    async getStatus(requestId: string): Promise<RelayStatusResponse> {
        const headers: Record<string, string> = {};
        if (this.apiKey) headers["x-api-key"] = this.apiKey;

        const response = await axios.get<RelayStatusResponse>(`${this.apiUrl}/intents/status/v3`, {
            params: { requestId },
            headers,
            timeout: RelayClient.TIMEOUT_MS,
        });
        return response.data;
    }
}
