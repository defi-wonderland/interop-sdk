import type { AcrossClientConfig } from "../clients/AcrossClient.js";
import type { RelayClientConfig } from "../clients/RelayClient.js";
import type { AssetDiscoveryService } from "../discovery/types.js";
import type {
    ConfirmResult,
    PreparedAction,
    SubmitContext,
    TrackingOptions,
    TrackingRef,
} from "../types/intent.js";
import type { SwapIntent, SwapOrderUpdate, SwapQuote, SwapQuoteRequest } from "../types/swap.js";
import { AcrossClient } from "../clients/AcrossClient.js";
import { OIFClient } from "../clients/OIFClient.js";
import { RelayClient } from "../clients/RelayClient.js";
import { AcrossAssetDiscovery } from "../discovery/AcrossAssetDiscovery.js";
import { OIFAssetDiscovery } from "../discovery/OIFAssetDiscovery.js";
import { IntentNotFoundError, QuoteTimeoutError, SubmitError } from "../errors.js";
import { AcrossSwap } from "../intents/across/AcrossSwap.js";
import { OIFEscrowSwap } from "../intents/oif/OIFEscrowSwap.js";
import { OIFUserOpenSwap } from "../intents/oif/OIFUserOpenSwap.js";
import { RelaySwap } from "../intents/relay/RelaySwap.js";
import { isTerminalStatus } from "../utils.js";

// ──── Config types for create() ────

export type OIFVariant = "escrow" | "user-open";

export interface OIFSolverEntry {
    solverId: string;
    url: string;
    headers?: Record<string, string>;
    adapterMetadata?: Record<string, unknown>;
}

export interface OIFProviderConfig {
    solvers: OIFSolverEntry[];
    variants?: OIFVariant[];
}

export interface CreateAggregatorConfig {
    oif?: OIFProviderConfig;
    across?: boolean | AcrossClientConfig;
    relay?: boolean | RelayClientConfig;

    custom?: (SwapIntent | IntentEntry)[];

    /** Enable pre-flight asset filtering to skip unsupported pairs */
    preflightFilter?: boolean;

    timeoutMs?: number;
    sortBy?: "output" | "eta";
}

// ──── Core types ────

export interface SwapQuoteError {
    protocol: string;
    variant: string;
    error: Error;
    message: string;
}

export interface SwapQuoteResult {
    quotes: SwapQuote[];
    errors: SwapQuoteError[];
}

export interface TrackingListener {
    onUpdate: (update: SwapOrderUpdate) => void;
    onError?: (error: Error) => void;
    onDone?: (lastUpdate: SwapOrderUpdate) => void;
}

export interface IntentEntry {
    intent: SwapIntent;
    discovery?: AssetDiscoveryService;
}

export interface SwapIntentAggregatorConfig {
    intents: (SwapIntent | IntentEntry)[];
    timeoutMs?: number;
    sortBy?: "output" | "eta";
}

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_OIF_VARIANTS: OIFVariant[] = ["escrow", "user-open"];

export class SwapIntentAggregator {
    private readonly entries: IntentEntry[];
    private readonly timeoutMs: number;
    private readonly sortBy: "output" | "eta";

    private readonly quoteRegistry = new Map<string, SwapIntent>();

    constructor(config: SwapIntentAggregatorConfig) {
        this.entries = config.intents.map((i) => ("intent" in i ? i : { intent: i }));
        this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
        this.sortBy = config.sortBy ?? "output";
    }

    get intents(): SwapIntent[] {
        return this.entries.map((e) => e.intent);
    }

    // ──── Factory ────

    static create(config: CreateAggregatorConfig): SwapIntentAggregator {
        const entries: IntentEntry[] = [];
        const preflight = config.preflightFilter ?? false;

        if (config.oif) {
            const variants = config.oif.variants ?? DEFAULT_OIF_VARIANTS;
            const variantFactories: Record<OIFVariant, (client: OIFClient) => SwapIntent> = {
                escrow: (c) => new OIFEscrowSwap(c),
                "user-open": (c) => new OIFUserOpenSwap(c),
            };

            for (const solver of config.oif.solvers) {
                const client = new OIFClient(solver);
                const discovery = preflight
                    ? new OIFAssetDiscovery({
                          solverId: solver.solverId,
                          baseUrl: solver.url,
                          source: `oif:${solver.solverId}`,
                      })
                    : undefined;
                for (const variant of variants) {
                    const factory = variantFactories[variant];
                    if (factory) entries.push({ intent: factory(client), discovery });
                }
            }
        }

        if (config.across) {
            const clientConfig = typeof config.across === "object" ? config.across : {};
            const isTestnet =
                typeof config.across === "object" ? config.across.isTestnet : undefined;
            entries.push({
                intent: new AcrossSwap(new AcrossClient(clientConfig)),
                discovery: preflight ? new AcrossAssetDiscovery({ isTestnet }) : undefined,
            });
        }

        if (config.relay) {
            const clientConfig = typeof config.relay === "object" ? config.relay : {};
            entries.push({ intent: new RelaySwap(new RelayClient(clientConfig)) });
        }

        if (config.custom) {
            for (const c of config.custom) {
                entries.push("intent" in c ? c : { intent: c });
            }
        }

        return new SwapIntentAggregator({
            intents: entries,
            timeoutMs: config.timeoutMs,
            sortBy: config.sortBy,
        });
    }

    // ──── Lifecycle ────

    async quote(params: SwapQuoteRequest): Promise<SwapQuoteResult> {
        const eligible = await this.filterEligible(params);

        const results = await Promise.all(
            eligible.map(async (entry) => {
                const intent = entry.intent;
                try {
                    const quotesPromise = intent.quote(params);
                    const quotes = await withTimeout(quotesPromise, this.timeoutMs);

                    for (const q of quotes) {
                        this.quoteRegistry.set(q.quoteId, intent);
                    }

                    return { quotes, error: null };
                } catch (error) {
                    return {
                        quotes: [] as SwapQuote[],
                        error: {
                            protocol: intent.protocol,
                            variant: intent.variant,
                            error: error instanceof Error ? error : new Error(String(error)),
                            message: error instanceof Error ? error.message : String(error),
                        } satisfies SwapQuoteError,
                    };
                }
            }),
        );

        const allQuotes = results.flatMap((r) => r.quotes);
        const errors = results.map((r) => r.error).filter((e): e is SwapQuoteError => e !== null);

        return {
            quotes: this.sortQuotes(allQuotes),
            errors,
        };
    }

    /**
     * Returns the raw action the wallet needs to execute.
     * For tx-based intents: { type: "tx", to, data, value?, chainId }
     * For sign-based intents: { type: "sign", typedData: { domain, types, ... } }
     */
    prepare(quote: SwapQuote): PreparedAction {
        const intent = this.getIntentForQuote(quote);
        return intent.prepare(quote);
    }

    /**
     * Wallet confirms the result of the action — SDK does any post-submit
     * work (e.g., posting signed order to solver) and returns a TrackingRef.
     */
    async confirm(quote: SwapQuote, result: ConfirmResult): Promise<TrackingRef> {
        const intent = this.getIntentForQuote(quote);
        const ref = await intent.confirm(quote, result);
        this.quoteRegistry.set(refKey(ref), intent);
        return ref;
    }

    /**
     * Convenience wrapper: prepare → execute via ctx → confirm.
     * For scripts and simple integrations that don't need full control.
     */
    async submit(quote: SwapQuote, ctx: SubmitContext): Promise<TrackingRef> {
        const intent = this.getIntentForQuote(quote);
        const ref = await intent.submit(quote, ctx);
        this.quoteRegistry.set(refKey(ref), intent);
        return ref;
    }

    async getStatus(ref: TrackingRef): Promise<SwapOrderUpdate> {
        const intent = this.resolveIntent(ref);
        return intent.getStatus(ref);
    }

    async *track(ref: TrackingRef, options?: TrackingOptions): AsyncGenerator<SwapOrderUpdate> {
        const intent = this.resolveIntent(ref);
        yield* intent.track(ref, options);
    }

    startTracking(
        ref: TrackingRef,
        listener: TrackingListener,
        options?: TrackingOptions,
    ): () => void {
        let stopped = false;

        const run = async () => {
            try {
                const gen = this.track(ref, options);
                for await (const update of gen) {
                    if (stopped) return;
                    listener.onUpdate(update);
                    if (isTerminalStatus(update.status)) {
                        listener.onDone?.(update);
                        return;
                    }
                }
            } catch (error) {
                if (stopped) return;
                listener.onError?.(error instanceof Error ? error : new Error(String(error)));
            }
        };

        run();

        return () => {
            stopped = true;
        };
    }

    // ──── Private ────

    private getIntentForQuote(quote: SwapQuote): SwapIntent {
        const intent = this.quoteRegistry.get(quote.quoteId);
        if (!intent) {
            throw new IntentNotFoundError(
                `No intent found for quoteId: ${quote.quoteId}`,
                "Was this quote returned by this aggregator?",
            );
        }
        return intent;
    }

    private resolveIntent(ref: TrackingRef): SwapIntent {
        const key = refKey(ref);
        const fromRegistry = this.quoteRegistry.get(key);
        if (fromRegistry) return fromRegistry;

        const entry = this.entries.find((e) => e.intent.protocol === ref.protocol);
        if (entry) {
            this.quoteRegistry.set(key, entry.intent);
            return entry.intent;
        }

        throw new IntentNotFoundError(
            `No intent found for protocol "${ref.protocol}"`,
            "Ensure the aggregator is configured with the same providers used when creating this ref.",
        );
    }

    /**
     * Pre-flight filter: skip intents whose discovery service says
     * the input or output asset is not supported. Entries without
     * a discovery service are always included.
     */
    private async filterEligible(params: SwapQuoteRequest): Promise<IntentEntry[]> {
        const checks = await Promise.all(
            this.entries.map(async (entry) => {
                if (!entry.discovery) return true;
                try {
                    const [inputOk, outputOk] = await Promise.all([
                        entry.discovery.isAssetSupported(params.input.chainId, params.input.token),
                        entry.discovery.isAssetSupported(
                            params.output.chainId,
                            params.output.token,
                        ),
                    ]);
                    return inputOk && outputOk;
                } catch {
                    return true;
                }
            }),
        );
        return this.entries.filter((_, i) => checks[i]);
    }

    private sortQuotes(quotes: SwapQuote[]): SwapQuote[] {
        return [...quotes].sort((a, b) => {
            if (this.sortBy === "eta") {
                return (a.eta ?? Infinity) - (b.eta ?? Infinity);
            }
            if (a.output.amount === b.output.amount) return 0;
            return a.output.amount > b.output.amount ? -1 : 1;
        });
    }
}

function refKey(ref: TrackingRef): string {
    return ref.type === "txHash" ? `tx:${ref.hash}` : `order:${ref.id}`;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new QuoteTimeoutError(`Timeout after ${ms}ms`)), ms);
        promise
            .then((val) => {
                clearTimeout(timer);
                resolve(val);
            })
            .catch((err) => {
                clearTimeout(timer);
                reject(err);
            });
    });
}
