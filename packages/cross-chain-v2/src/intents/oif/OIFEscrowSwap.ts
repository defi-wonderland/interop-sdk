import type { Quote } from "@openintentsframework/oif-specs";
import type { Hex } from "viem";
import {
    adaptOrderStatus,
    adaptTypedDataPayload,
    prefixSignatureForOrderType,
} from "@wonderland/interop-cross-chain";
import { v4 as uuid } from "uuid";

import type { OIFClient } from "../../clients/OIFClient.js";
import type {
    ConfirmResult,
    PreparedAction,
    SubmitContext,
    TrackingOptions,
    TrackingRef,
} from "../../types/intent.js";
import type { SwapIntent, SwapOrderUpdate, SwapQuote, SwapQuoteRequest } from "../../types/swap.js";
import { PayloadValidationError, SubmitError, TrackingRefInvalidError } from "../../errors.js";
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

export class OIFEscrowSwap implements SwapIntent {
    readonly protocol = "oif";
    readonly variant = "escrow";
    readonly submission = "sign" as const;

    private readonly pendingQuotes = new Map<string, Quote>();

    constructor(private readonly client: OIFClient) {}

    async quote(params: SwapQuoteRequest): Promise<SwapQuote[]> {
        const oifRequest = swapRequestToOifRequest(params, ["oif-escrow-v0"]);
        const response = await this.client.fetchQuotes(oifRequest);

        return response.quotes
            .filter((q: Quote) => q.order.type === "oif-escrow-v0")
            .map((rawQuote: Quote) => {
                const adapted = adaptTypedDataPayload(rawQuote);
                const quoteId = adapted.quoteId ?? uuid();
                this.pendingQuotes.set(quoteId, adapted);
                return oifQuoteToSwapQuote(
                    adapted,
                    this.protocol,
                    this.variant,
                    this.submission,
                    quoteId,
                );
            });
    }

    prepare(quote: SwapQuote): PreparedAction {
        const rawQuote = this.pendingQuotes.get(quote.quoteId);
        if (!rawQuote) {
            throw new SubmitError(`No pending quote for quoteId: ${quote.quoteId}`);
        }

        this.validatePayloadConsistency(rawQuote, quote);

        if (!quote.signPayload) {
            throw new SubmitError("OIF escrow quote is missing signPayload");
        }

        return {
            type: "sign",
            typedData: quote.signPayload,
        };
    }

    async confirm(quote: SwapQuote, result: ConfirmResult): Promise<TrackingRef> {
        if (result.type !== "sign") {
            throw new SubmitError("OIF escrow orders require ConfirmResult type 'sign'");
        }

        const rawQuote = this.pendingQuotes.get(quote.quoteId);
        if (!rawQuote) {
            throw new SubmitError(`No pending quote for quoteId: ${quote.quoteId}`);
        }

        const prefixed = prefixSignatureForOrderType(result.signature, rawQuote.order.type);

        const { ...quoteForSolver } = rawQuote;
        const adapted = {
            quoteResponse: quoteForSolver,
            signature: prefixed,
        };

        const response = await this.client.postOrder(adapted as Record<string, unknown>);
        this.pendingQuotes.delete(quote.quoteId);

        return {
            type: "orderId",
            protocol: this.protocol,
            id: response.orderId ?? quote.quoteId,
            originChainId: quote.input.chainId,
            destinationChainId: quote.output.chainId,
        };
    }

    async submit(quote: SwapQuote, ctx: SubmitContext): Promise<TrackingRef> {
        if (ctx.type !== "sign") {
            throw new SubmitError("OIF escrow orders require ctx.type === 'sign'");
        }

        const action = this.prepare(quote);
        if (action.type !== "sign") throw new SubmitError("Unexpected prepare result");

        const signature = await ctx.signTypedData(action);
        return this.confirm(quote, { type: "sign", signature });
    }

    async getStatus(ref: TrackingRef): Promise<SwapOrderUpdate> {
        if (ref.type !== "orderId") {
            throw new TrackingRefInvalidError(
                "OIF escrow getStatus requires TrackingRef type 'orderId'",
            );
        }

        try {
            const raw = await this.client.getOrderStatus(ref.id);
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
                orderId: ref.id,
                fillTxHash,
                message: `Order ${status}`,
            };
        } catch (error) {
            return {
                status: "pending",
                timestamp: nowSeconds(),
                orderId: ref.id,
                message: `Status check failed: ${error instanceof Error ? error.message : "unknown"}`,
            };
        }
    }

    async *track(ref: TrackingRef, options?: TrackingOptions): AsyncGenerator<SwapOrderUpdate> {
        if (ref.type !== "orderId") {
            throw new TrackingRefInvalidError(
                "OIF escrow tracking requires TrackingRef type 'orderId'",
            );
        }

        const pollMs = options?.pollIntervalMs ?? DEFAULT_POLL_MS;
        const maxMs = options?.maxDurationMs ?? DEFAULT_MAX_DURATION_MS;

        yield {
            status: "pending",
            timestamp: nowSeconds(),
            orderId: ref.id,
            message: "Tracking escrow order...",
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
            orderId: ref.id,
            message: "Tracking timed out",
        };
    }

    private validatePayloadConsistency(rawQuote: Quote, quote: SwapQuote): void {
        const preview = rawQuote.preview;
        if (!preview) return;

        const previewInput = preview.inputs?.[0];
        const previewOutput = preview.outputs?.[0];

        if (previewInput?.amount) {
            const rawInputAmount = BigInt(previewInput.amount);
            if (rawInputAmount !== quote.input.amount) {
                throw new PayloadValidationError(
                    `OIF escrow input amount mismatch. Quote: ${quote.input.amount}, Preview: ${rawInputAmount}`,
                );
            }
        }

        if (previewOutput?.amount) {
            const rawOutputAmount = BigInt(previewOutput.amount);
            if (rawOutputAmount !== quote.output.amount) {
                throw new PayloadValidationError(
                    `OIF escrow output amount mismatch. Quote: ${quote.output.amount}, Preview: ${rawOutputAmount}`,
                );
            }
        }
    }
}
