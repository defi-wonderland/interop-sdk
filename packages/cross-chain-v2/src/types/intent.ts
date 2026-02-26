import type { Address, Hex } from "viem";

export interface TrackingOptions {
    pollIntervalMs?: number;
    maxDurationMs?: number;
}

// ──── Prepared actions (SDK → Wallet) ────

export interface PreparedTx {
    type: "tx";
    to: Address;
    data: Hex;
    value?: bigint;
    chainId: number;
}

export interface PreparedSign {
    type: "sign";
    typedData: {
        domain: Record<string, unknown>;
        types: Record<string, Array<{ name: string; type: string }>>;
        primaryType: string;
        message: Record<string, unknown>;
    };
}

export type PreparedAction = PreparedTx | PreparedSign;

// ──── Confirm results (Wallet → SDK) ────

export type ConfirmResult = { type: "tx"; txHash: Hex } | { type: "sign"; signature: Hex };

// ──── Legacy SubmitContext (convenience wrapper) ────

export type SubmitContext =
    | { type: "tx"; sendTransaction: (action: PreparedTx) => Promise<Hex> }
    | { type: "sign"; signTypedData: (action: PreparedSign) => Promise<Hex> };

// ──── Tracking ref ────

interface TrackingRefBase {
    protocol: string;
    originChainId: number;
    destinationChainId: number;
    meta?: Record<string, unknown>;
}

export type TrackingRef =
    | (TrackingRefBase & { type: "txHash"; hash: Hex })
    | (TrackingRefBase & { type: "orderId"; id: string });

// ──── Intent interface ────

export interface Intent<TParams, TQuote, TUpdate> {
    readonly protocol: string;
    readonly variant: string;
    readonly submission: "tx" | "sign";

    quote(params: TParams): Promise<TQuote[]>;

    /** Returns the raw action the wallet needs to execute */
    prepare(quote: TQuote): PreparedAction;

    /** Wallet confirms the result — SDK does post-submit work and returns tracking ref */
    confirm(quote: TQuote, result: ConfirmResult): Promise<TrackingRef>;

    /** Convenience: prepare → execute via ctx → confirm. For scripts / simple integrations */
    submit(quote: TQuote, ctx: SubmitContext): Promise<TrackingRef>;

    /** One-shot status check */
    getStatus(ref: TrackingRef): Promise<TUpdate>;

    /** Auto-polling generator */
    track(ref: TrackingRef, options?: TrackingOptions): AsyncGenerator<TUpdate>;
}
