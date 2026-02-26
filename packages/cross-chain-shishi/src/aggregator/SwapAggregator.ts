import type { Hex } from "viem";
import type {
    ChainAssets,
    OrderReference,
    OrderStatusUpdate,
    SortStrategy,
    SwapAdapter,
    SwapQuote,
    SwapQuoteRequest,
} from "../core/types.js";
import { AdapterNotFoundError } from "../core/errors.js";
import { createHttpClient } from "../core/http.js";
import * as OIF from "../protocols/oif/index.js";

export interface SolverConfig {
    url: string;
    apiKey?: string;
    variants?: ("escrow" | "user-open")[];
}

export interface CreateAggregatorConfig {
    oif?: { solvers: SolverConfig[] };
    across?: boolean | { url?: string };
    // relay?: boolean | { ... };
    custom?: SwapAdapter[];
}

export class SwapAggregator {
    private adapters: SwapAdapter[];

    private constructor(adapters: SwapAdapter[]) {
        this.adapters = adapters;
    }

    // Declarative config → wires up HttpClient, protocol Clients, and adapters
    static create(config: CreateAggregatorConfig): SwapAggregator {
        const adapters: SwapAdapter[] = [];

        if (config.oif) {
            for (const solver of config.oif.solvers) {
                const http = createHttpClient({
                    baseUrl: solver.url,
                    headers: solver.apiKey ? { "x-api-key": solver.apiKey } : undefined,
                });
                const client = new OIF.Client(http);
                const variants = solver.variants ?? ["escrow", "user-open"];

                if (variants.includes("escrow")) adapters.push(new OIF.EscrowAdapter(client));
                if (variants.includes("user-open")) adapters.push(new OIF.UserOpenAdapter(client));
            }
        }

        if (config.custom) {
            adapters.push(...config.custom);
        }

        return new SwapAggregator(adapters);
    }

    // ─── Discovery ──────────────────────────────────────────────

    // Query every adapter, merge & deduplicate
    async getSupportedAssets(): Promise<ChainAssets[]> {
        throw new Error("Not implemented");
    }

    // Merge supported chain IDs from all adapters
    async getSupportedChains(): Promise<number[]> {
        throw new Error("Not implemented");
    }

    // ─── Quoting ────────────────────────────────────────────────

    // Fan out to all adapters in parallel, collect, flatten & sort
    async getQuotes(_req: SwapQuoteRequest, _sortBy?: SortStrategy): Promise<SwapQuote[]> {
        throw new Error("Not implemented");
    }

    // Verify quote integrity before executing (amounts, tokens, chains match the request)
    async validateQuote(req: SwapQuoteRequest, quote: SwapQuote): Promise<boolean> {
        return this.resolveAdapter(quote.protocol).validateQuote(req, quote);
    }

    // ─── Submission ─────────────────────────────────────────────

    // Route to the adapter with the user's signature or txHash
    async submit(quote: SwapQuote, result: Hex): Promise<OrderReference> {
        return this.resolveAdapter(quote.protocol).submit(quote, result);
    }

    // ─── Tracking ───────────────────────────────────────────────

    // One-shot status check without polling
    async getOrderStatus(ref: OrderReference): Promise<OrderStatusUpdate> {
        return this.resolveAdapter(ref.protocol).getOrderStatus(ref);
    }

    // Stream status updates until terminal state
    async *trackOrder(ref: OrderReference): AsyncGenerator<OrderStatusUpdate> {
        yield* this.resolveAdapter(ref.protocol).trackOrder(ref);
    }

    // ─── Internal ───────────────────────────────────────────────

    private resolveAdapter(protocol: string): SwapAdapter {
        const adapter = this.adapters.find((a) => a.protocol === protocol);
        if (!adapter) throw new AdapterNotFoundError(protocol);
        return adapter;
    }
}
