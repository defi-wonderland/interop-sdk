import type { Quote } from "@openintentsframework/oif-specs";
import type { EIP7683ResolvedOrder } from "@wonderland/interop-cross-chain";
import type { Address, Hex } from "viem";
import {
    adaptOrderStatus,
    adaptTypedDataPayload,
    getChainById,
    OPEN_EVENT_ABI,
    OPEN_EVENT_SIGNATURE,
    PublicClientManager,
} from "@wonderland/interop-cross-chain";
import { v4 as uuid } from "uuid";
import { bytesToHex, decodeEventLog } from "viem";

import type { OIFClient } from "../../clients/OIFClient.js";
import type {
    ConfirmResult,
    PreparedAction,
    SubmitContext,
    TrackingOptions,
    TrackingRef,
} from "../../types/intent.js";
import type {
    ApprovalRequirement,
    SwapIntent,
    SwapOrderUpdate,
    SwapQuote,
    SwapQuoteRequest,
} from "../../types/swap.js";
import { OpenEventParseError, SubmitError, TrackingRefInvalidError } from "../../errors.js";
import {
    isTerminalStatus,
    mapOifStatus,
    nowSeconds,
    oifQuoteToSwapQuote,
    sleep,
    swapRequestToOifRequest,
} from "./helpers.js";

const DEFAULT_POLL_MS = 5_000;
const DEFAULT_MAX_DURATION_MS = 5 * 60 * 1_000;

interface PendingUserOpenQuote {
    rawQuote: Quote;
}

export class OIFUserOpenSwap implements SwapIntent {
    readonly protocol = "oif";
    readonly variant = "user-open";
    readonly submission = "tx" as const;

    private readonly pendingQuotes = new Map<string, PendingUserOpenQuote>();
    private readonly clientManager = new PublicClientManager();

    constructor(private readonly client: OIFClient) {}

    async quote(params: SwapQuoteRequest): Promise<SwapQuote[]> {
        const oifRequest = swapRequestToOifRequest(params, ["oif-user-open-v0"]);
        const response = await this.client.fetchQuotes(oifRequest);

        return response.quotes
            .filter((q: Quote) => q.order.type === "oif-user-open-v0")
            .map((rawQuote: Quote) => {
                const adapted = adaptTypedDataPayload(rawQuote);
                const quoteId = adapted.quoteId ?? uuid();

                if (!this.hasOpenIntentTx(adapted)) return null;

                this.pendingQuotes.set(quoteId, { rawQuote: adapted });

                const swapQuote = oifQuoteToSwapQuote(
                    adapted,
                    this.protocol,
                    this.variant,
                    this.submission,
                    quoteId,
                );

                swapQuote.approvals = this.extractApprovals(adapted);

                return swapQuote;
            })
            .filter((q): q is SwapQuote => q !== null);
    }

    prepare(quote: SwapQuote): PreparedAction {
        const pending = this.pendingQuotes.get(quote.quoteId);
        if (!pending) {
            throw new SubmitError(`No pending quote for quoteId: ${quote.quoteId}`);
        }

        const { rawQuote } = pending;
        if (rawQuote.order.type !== "oif-user-open-v0") {
            throw new SubmitError("Quote is not oif-user-open-v0");
        }

        const tx = rawQuote.order.openIntentTx;

        return {
            type: "tx",
            to: tx.to as Address,
            data: bytesToHex(tx.data),
            chainId: quote.input.chainId,
        };
    }

    async confirm(quote: SwapQuote, result: ConfirmResult): Promise<TrackingRef> {
        if (result.type !== "tx") {
            throw new SubmitError("OIF user-open orders require ConfirmResult type 'tx'");
        }

        this.pendingQuotes.delete(quote.quoteId);

        return {
            type: "txHash",
            protocol: this.protocol,
            hash: result.txHash,
            originChainId: quote.input.chainId,
            destinationChainId: quote.output.chainId,
        };
    }

    async submit(quote: SwapQuote, ctx: SubmitContext): Promise<TrackingRef> {
        if (ctx.type !== "tx") {
            throw new SubmitError("OIF user-open orders require ctx.type === 'tx'");
        }

        const action = this.prepare(quote);
        if (action.type !== "tx") throw new SubmitError("Unexpected prepare result");

        const txHash = await ctx.sendTransaction(action);
        return this.confirm(quote, { type: "tx", txHash });
    }

    async getStatus(ref: TrackingRef): Promise<SwapOrderUpdate> {
        if (ref.type !== "txHash") {
            throw new TrackingRefInvalidError(
                "OIF user-open getStatus requires TrackingRef type 'txHash'",
            );
        }

        let orderId = ref.meta?.orderId as string | undefined;
        if (!orderId) {
            orderId = await this.parseOpenEvent(ref.hash, ref.originChainId);
            if (orderId && ref.meta) ref.meta.orderId = orderId;
        }

        if (!orderId) {
            return {
                status: "pending",
                timestamp: nowSeconds(),
                message: "Waiting for Open event...",
            };
        }

        try {
            const raw = await this.client.getOrderStatus(orderId);
            const record = raw as Record<string, unknown>;
            const oifStatus = adaptOrderStatus(record.status);
            const status = mapOifStatus(oifStatus);
            const fillTxHash = (record.fillTxHash ??
                (record.fillTransaction as Record<string, unknown> | undefined)?.hash) as
                | Hex
                | undefined;

            return {
                status,
                timestamp: nowSeconds(),
                orderId,
                fillTxHash,
                message: `Order ${status}`,
            };
        } catch (error) {
            return {
                status: "pending",
                timestamp: nowSeconds(),
                orderId,
                message: `Status check failed: ${error instanceof Error ? error.message : "unknown"}`,
            };
        }
    }

    async *track(ref: TrackingRef, options?: TrackingOptions): AsyncGenerator<SwapOrderUpdate> {
        if (ref.type !== "txHash") {
            throw new TrackingRefInvalidError(
                "OIF user-open tracking requires TrackingRef type 'txHash'",
            );
        }

        const pollMs = options?.pollIntervalMs ?? DEFAULT_POLL_MS;
        const maxMs = options?.maxDurationMs ?? DEFAULT_MAX_DURATION_MS;

        yield {
            status: "submitted",
            timestamp: nowSeconds(),
            message: "Transaction submitted, waiting for confirmation...",
        };

        const reverted = await this.checkTxReverted(ref.hash, ref.originChainId);
        if (reverted) {
            yield {
                status: "failed",
                timestamp: nowSeconds(),
                failureReason: "Origin transaction reverted",
                message: "Origin transaction reverted on-chain",
            };
            return;
        }

        let orderId: string | undefined;
        try {
            orderId = await this.parseOpenEvent(ref.hash, ref.originChainId);
        } catch {
            yield {
                status: "failed",
                timestamp: nowSeconds(),
                failureReason: "Could not parse Open event from tx receipt",
                message:
                    "Open event not found — tx may have succeeded but did not emit expected ERC-7683 event",
            };
            return;
        }

        if (!orderId) {
            yield {
                status: "failed",
                timestamp: nowSeconds(),
                failureReason: "Open event missing orderId",
                message: "Open event found but orderId is missing",
            };
            return;
        }

        if (!ref.meta) (ref as { meta: Record<string, unknown> }).meta = {};
        ref.meta!.orderId = orderId;

        yield {
            status: "pending",
            timestamp: nowSeconds(),
            orderId,
            message: `Order parsed: ${orderId.slice(0, 10)}... Waiting for solver fill...`,
        };

        const deadline = Date.now() + maxMs;

        while (Date.now() < deadline) {
            const update = await this.getStatus(ref);
            yield update;
            if (isTerminalStatus(update.status)) return;
            await sleep(pollMs);
        }

        yield {
            status: "expired",
            timestamp: nowSeconds(),
            orderId,
            message: "Tracking timed out",
        };
    }

    private extractApprovals(quote: Quote): ApprovalRequirement[] | undefined {
        const order = quote.order as unknown as Record<string, unknown>;
        const checks = order.checks as
            | { allowances?: Array<{ token: string; spender: string; required: string }> }
            | undefined;
        if (!checks?.allowances?.length) return undefined;

        return checks.allowances.map((a) => ({
            token: a.token as Address,
            spender: a.spender as Address,
            amount: BigInt(a.required),
        }));
    }

    private hasOpenIntentTx(quote: Quote): boolean {
        return quote.order.type === "oif-user-open-v0" && !!quote.order.openIntentTx;
    }

    private async checkTxReverted(txHash: Hex, chainId: number): Promise<boolean> {
        try {
            const chain = getChainById(chainId);
            const client = this.clientManager.getClient(chain);
            const receipt = await client.getTransactionReceipt({ hash: txHash });
            return receipt.status === "reverted";
        } catch {
            return false;
        }
    }

    private async parseOpenEvent(txHash: Hex, chainId: number): Promise<string | undefined> {
        const chain = getChainById(chainId);
        const client = this.clientManager.getClient(chain);
        const receipt = await client.getTransactionReceipt({ hash: txHash });

        const openLog = receipt.logs.find((log) => log.topics[0] === OPEN_EVENT_SIGNATURE);
        if (!openLog) {
            throw new OpenEventParseError("Open event not found in transaction receipt");
        }

        const decoded = decodeEventLog({
            abi: OPEN_EVENT_ABI,
            data: openLog.data,
            topics: openLog.topics,
        });

        const { orderId } = decoded.args as { orderId: Hex; resolvedOrder: EIP7683ResolvedOrder };
        return orderId;
    }
}
