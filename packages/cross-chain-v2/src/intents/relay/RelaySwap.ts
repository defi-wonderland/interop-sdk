import type { Address, Hex } from "viem";
import { getChainById, PublicClientManager } from "@wonderland/interop-cross-chain";
import { v4 as uuid } from "uuid";

import type { RelayClient, RelayQuoteResponse, RelayStep } from "../../clients/RelayClient.js";
import type {
    ConfirmResult,
    PreparedAction,
    SubmitContext,
    TrackingOptions,
    TrackingRef,
} from "../../types/intent.js";
import type {
    SwapIntent,
    SwapOrderStatus,
    SwapOrderUpdate,
    SwapQuote,
    SwapQuoteRequest,
} from "../../types/swap.js";
import { PayloadValidationError, SubmitError, TrackingRefInvalidError } from "../../errors.js";
import { isTerminalStatus, nowSeconds, sleep } from "../../utils.js";

const DEFAULT_POLL_MS = 2_000;
const DEFAULT_MAX_DURATION_MS = 5 * 60 * 1_000;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

interface PendingRelayQuote {
    response: RelayQuoteResponse;
    depositStep: RelayStep;
    requestId: string;
}

export class RelaySwap implements SwapIntent {
    readonly protocol = "relay";
    readonly variant = "default";
    readonly submission = "tx" as const;

    private readonly pendingQuotes = new Map<string, PendingRelayQuote>();
    private readonly clientManager = new PublicClientManager();

    constructor(private readonly client: RelayClient) {}

    async quote(params: SwapQuoteRequest): Promise<SwapQuote[]> {
        const relayRequest = {
            user: params.user,
            originChainId: params.input.chainId,
            destinationChainId: params.output.chainId,
            originCurrency: params.input.token === ZERO_ADDRESS ? ZERO_ADDRESS : params.input.token,
            destinationCurrency:
                params.output.token === ZERO_ADDRESS ? ZERO_ADDRESS : params.output.token,
            amount: params.input.amount.toString(),
            tradeType:
                (params.swapType ?? "exact-input") === "exact-input"
                    ? ("EXACT_INPUT" as const)
                    : ("EXACT_OUTPUT" as const),
            recipient: params.recipient ?? params.user,
        };

        const response = await this.client.getQuote(relayRequest);

        const depositStep = response.steps?.find(
            (s) => s.kind === "transaction" && s.items?.length > 0,
        );
        if (!depositStep) return [];

        const item = depositStep.items[0];
        if (!item?.data) return [];

        const quoteId = uuid();
        const requestId = depositStep.requestId ?? quoteId;
        this.pendingQuotes.set(quoteId, { response, depositStep, requestId });

        const outputAmount = response.details?.currencyOut?.amount
            ? BigInt(response.details.currencyOut.amount)
            : params.input.amount;

        const spender = item.data.to as Address;

        return [
            {
                quoteId,
                protocol: this.protocol,
                variant: this.variant,
                submission: this.submission,
                input: {
                    chainId: params.input.chainId,
                    token: params.input.token,
                    amount: params.input.amount,
                },
                output: {
                    chainId: params.output.chainId,
                    token: params.output.token,
                    amount: outputAmount,
                },
                eta: response.details?.timeEstimate,
                approvals: spender
                    ? [
                          {
                              token: params.input.token,
                              spender,
                              amount: params.input.amount,
                          },
                      ]
                    : undefined,
            },
        ];
    }

    prepare(quote: SwapQuote): PreparedAction {
        const pending = this.pendingQuotes.get(quote.quoteId);
        if (!pending) {
            throw new SubmitError(`No pending quote for quoteId: ${quote.quoteId}`);
        }

        const item = pending.depositStep.items[0];
        if (!item?.data) {
            throw new SubmitError("Relay deposit step has no transaction data");
        }

        this.validateTxConsistency(pending);

        return {
            type: "tx",
            to: item.data.to as Address,
            data: item.data.data as Hex,
            value: item.data.value ? BigInt(item.data.value) : undefined,
            chainId: item.data.chainId,
        };
    }

    async confirm(quote: SwapQuote, result: ConfirmResult): Promise<TrackingRef> {
        if (result.type !== "tx") {
            throw new SubmitError("Relay orders require ConfirmResult type 'tx'");
        }

        const pending = this.pendingQuotes.get(quote.quoteId);
        const requestId = pending?.requestId ?? quote.quoteId;
        this.pendingQuotes.delete(quote.quoteId);

        return {
            type: "txHash",
            protocol: this.protocol,
            hash: result.txHash,
            originChainId: quote.input.chainId,
            destinationChainId: quote.output.chainId,
            meta: { requestId },
        };
    }

    async submit(quote: SwapQuote, ctx: SubmitContext): Promise<TrackingRef> {
        if (ctx.type !== "tx") {
            throw new SubmitError("Relay swaps require ctx.type === 'tx'");
        }

        const action = this.prepare(quote);
        if (action.type !== "tx") throw new SubmitError("Unexpected prepare result");

        const txHash = await ctx.sendTransaction(action);
        return this.confirm(quote, { type: "tx", txHash });
    }

    async getStatus(ref: TrackingRef): Promise<SwapOrderUpdate> {
        if (ref.type !== "txHash") {
            throw new TrackingRefInvalidError("Relay getStatus requires TrackingRef type 'txHash'");
        }

        const requestId = ref.meta?.requestId as string | undefined;
        if (!requestId) {
            throw new TrackingRefInvalidError("No requestId in TrackingRef.meta.");
        }

        try {
            const response = await this.client.getStatus(requestId);
            const status = mapRelayStatus(response.status);
            const fillTxHash = response.txHashes?.[0] as Hex | undefined;

            return {
                status,
                timestamp: nowSeconds(),
                fillTxHash,
                message: `Relay intent ${response.status}`,
            };
        } catch (error) {
            return {
                status: "pending",
                timestamp: nowSeconds(),
                message: `Status check failed: ${error instanceof Error ? error.message : "unknown"}`,
            };
        }
    }

    async *track(ref: TrackingRef, options?: TrackingOptions): AsyncGenerator<SwapOrderUpdate> {
        if (ref.type !== "txHash") {
            throw new TrackingRefInvalidError("Relay tracking requires TrackingRef type 'txHash'");
        }

        if (!ref.meta?.requestId) {
            throw new TrackingRefInvalidError(
                "No requestId in TrackingRef.meta. Was this ref returned by confirm()?",
            );
        }

        const pollMs = options?.pollIntervalMs ?? DEFAULT_POLL_MS;
        const maxMs = options?.maxDurationMs ?? DEFAULT_MAX_DURATION_MS;

        yield {
            status: "submitted",
            timestamp: nowSeconds(),
            message: "Deposit submitted, checking origin tx...",
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

        yield {
            status: "pending",
            timestamp: nowSeconds(),
            message: "Deposit confirmed, tracking via Relay API...",
        };

        const deadline = Date.now() + maxMs;

        while (Date.now() < deadline) {
            const update = await this.getStatus(ref);
            yield update;
            if (isTerminalStatus(update.status)) return;
            await sleep(pollMs);
        }

        yield { status: "expired", timestamp: nowSeconds(), message: "Tracking timed out" };
    }

    private validateTxConsistency(pending: PendingRelayQuote): void {
        const stepTo = pending.depositStep.items[0]?.data?.to;
        if (!stepTo) return;

        const depositAddress = pending.depositStep.depositAddress;
        if (depositAddress && stepTo.toLowerCase() !== depositAddress.toLowerCase()) {
            throw new PayloadValidationError(
                `step.to (${stepTo}) does not match depositAddress (${depositAddress})`,
            );
        }
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
}

function mapRelayStatus(relayStatus: string): SwapOrderStatus {
    switch (relayStatus) {
        case "success":
            return "finalized";
        case "submitted":
            return "filling";
        case "pending":
        case "delayed":
        case "waiting":
            return "pending";
        case "refunded":
            return "refunded";
        case "failure":
            return "failed";
        default:
            return "pending";
    }
}
