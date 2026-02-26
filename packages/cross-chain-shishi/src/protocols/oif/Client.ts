import type { HttpClient } from "../../core/http.js";

// ─── OIF Solver API Request Types ───────────────────────────────

export interface OIFQuoteRequest {
    user: string;
    intent: {
        intentType: "oif-swap";
        inputs: Array<{ user: string; asset: string; amount?: string }>;
        outputs: Array<{ receiver: string; asset: string; amount?: string }>;
        swapType?: "exact-input" | "exact-output";
    };
    supportedTypes: string[];
}

export interface OIFPostOrderRequest {
    quoteResponse: OIFQuote;
    signature: string;
}

// ─── OIF Solver API Response Types ──────────────────────────────

export interface OIFQuoteResponse {
    quotes: OIFQuote[];
}

export interface OIFQuote {
    quoteId?: string;
    order: Record<string, unknown>;
    preview: {
        inputs: Array<{ asset: string; amount: string }>;
        outputs: Array<{ asset: string; amount: string }>;
    };
    validUntil?: number;
    eta?: number;
    // EIP-712 typed data for signature-based flows — needs normalization
    typedData?: Record<string, unknown>;
    // Pre-built tx for transaction-based flows (e.g. user-open)
    preparedTransaction?: { to: string; data: string; value?: string };
}

export interface OIFPostOrderResponse {
    orderId?: string;
    status: string;
    message?: string;
}

export interface OIFOrderStatusResponse {
    orderId: string;
    // Known to diverge from spec: can be a string or an object — needs normalization
    status: string | Record<string, unknown>;
    createdAt?: number;
    updatedAt?: number;
    fillTxHash?: string;
    fillTransaction?: { hash?: string };
}

// Assets endpoint returns networks as a record keyed by network name
export interface OIFAssetsResponse {
    networks: Record<
        string,
        { chain_id: number; assets: Array<{ address: string; symbol: string; decimals: number }> }
    >;
}

// ─── Client ─────────────────────────────────────────────────────

/**
 * Thin typed wrapper over the OIF Solver HTTP API.
 * Returns raw API shapes — adapters handle normalization to SDK types.
 */
export class Client {
    private http: HttpClient;

    constructor(http: HttpClient) {
        this.http = http;
    }

    async getQuotes(req: OIFQuoteRequest): Promise<OIFQuoteResponse> {
        const res = await this.http.post<OIFQuoteResponse>("/v1/quotes", req);
        return res.data;
    }

    async postOrder(req: OIFPostOrderRequest): Promise<OIFPostOrderResponse> {
        const res = await this.http.post<OIFPostOrderResponse>("/v1/orders", req);
        return res.data;
    }

    async getOrder(orderId: string): Promise<OIFOrderStatusResponse> {
        const res = await this.http.get<OIFOrderStatusResponse>(`/v1/orders/${orderId}`);
        return res.data;
    }

    async getAssets(): Promise<OIFAssetsResponse> {
        const res = await this.http.get<OIFAssetsResponse>("/api/tokens");
        return res.data;
    }
}
