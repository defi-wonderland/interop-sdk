import type { AcrossGetQuoteParams, AcrossGetQuoteResponse } from "@wonderland/interop-cross-chain";
import type { Address, Hex } from "viem";
import {
    ACROSS_ORIGIN_SETTLER_ADDRESSES,
    AcrossGetQuoteParamsSchema,
    getChainById,
    PublicClientManager,
} from "@wonderland/interop-cross-chain";
import { v4 as uuid } from "uuid";
import { decodeFunctionData, getAddress, isAddressEqual, slice, toFunctionSelector } from "viem";

import type { AcrossClient } from "../../clients/AcrossClient.js";
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
import {
    PayloadValidationError,
    SettlerValidationError,
    SubmitError,
    TrackingRefInvalidError,
} from "../../errors.js";
import { isTerminalStatus, nowSeconds, sleep } from "../../utils.js";

const ACROSS_DEPOSIT_ABI = [
    {
        inputs: [
            { name: "depositor", type: "bytes32" },
            { name: "recipient", type: "bytes32" },
            { name: "inputToken", type: "bytes32" },
            { name: "outputToken", type: "bytes32" },
            { name: "inputAmount", type: "uint256" },
            { name: "outputAmount", type: "uint256" },
            { name: "destinationChainId", type: "uint256" },
            { name: "exclusiveRelayer", type: "bytes32" },
            { name: "quoteTimestamp", type: "uint32" },
            { name: "fillDeadline", type: "uint32" },
            { name: "exclusivityParameter", type: "uint32" },
            { name: "message", type: "bytes" },
        ],
        name: "deposit",
        outputs: [],
        stateMutability: "payable",
        type: "function",
    },
] as const;

const DEPOSIT_SELECTOR = toFunctionSelector(ACROSS_DEPOSIT_ABI[0]);

function bytes32ToAddress(b: Hex): Address {
    return `0x${b.slice(-40)}` as Address;
}

const DEFAULT_POLL_MS = 12_000;
const DEFAULT_MAX_DURATION_MS = 5 * 60 * 1_000;

interface PendingAcrossQuote {
    acrossResponse: AcrossGetQuoteResponse;
    params: SwapQuoteRequest;
}

export class AcrossSwap implements SwapIntent {
    readonly protocol = "across";
    readonly variant = "default";
    readonly submission = "tx" as const;

    private readonly pendingQuotes = new Map<string, PendingAcrossQuote>();
    private readonly clientManager = new PublicClientManager();

    constructor(private readonly client: AcrossClient) {}

    async quote(params: SwapQuoteRequest): Promise<SwapQuote[]> {
        const acrossParams = this.toAcrossParams(params);
        const acrossResponse = await this.client.getSwapQuote(acrossParams);

        const quoteId = acrossResponse.id ?? uuid();
        this.pendingQuotes.set(quoteId, { acrossResponse, params });

        const spender = acrossResponse.swapTx.to as Address;

        return [
            {
                quoteId,
                protocol: this.protocol,
                variant: this.variant,
                submission: this.submission,
                input: {
                    chainId: acrossResponse.inputToken.chainId,
                    token: acrossResponse.inputToken.address as Address,
                    amount: BigInt(acrossResponse.inputAmount),
                },
                output: {
                    chainId: acrossResponse.outputToken.chainId,
                    token: acrossResponse.outputToken.address as Address,
                    amount: BigInt(acrossResponse.expectedOutputAmount),
                },
                eta: acrossResponse.expectedFillTime,
                approvals: spender
                    ? [
                          {
                              token: acrossResponse.inputToken.address as Address,
                              spender,
                              amount: BigInt(acrossResponse.inputAmount),
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

        const { swapTx } = pending.acrossResponse;

        this.validateSettler(swapTx.to as Address, quote.input.chainId);
        this.validateCalldata(swapTx.data as Hex, quote, pending.params);

        return {
            type: "tx",
            to: swapTx.to as Address,
            data: swapTx.data as Hex,
            chainId: swapTx.chainId,
        };
    }

    async confirm(quote: SwapQuote, result: ConfirmResult): Promise<TrackingRef> {
        if (result.type !== "tx") {
            throw new SubmitError("Across orders require ConfirmResult type 'tx'");
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
            throw new SubmitError("Across orders require ctx.type === 'tx'");
        }

        const action = this.prepare(quote);
        if (action.type !== "tx") throw new SubmitError("Unexpected prepare result");

        const txHash = await ctx.sendTransaction(action);
        return this.confirm(quote, { type: "tx", txHash });
    }

    async getStatus(ref: TrackingRef): Promise<SwapOrderUpdate> {
        if (ref.type !== "txHash") {
            throw new TrackingRefInvalidError(
                "Across getStatus requires TrackingRef type 'txHash'",
            );
        }

        try {
            const response = await this.client.getDepositStatus(ref.hash);
            const status = mapAcrossStatus(response.status);
            const fillTxHash = response.fillTxnRef as Hex | undefined;

            return {
                status,
                timestamp: nowSeconds(),
                fillTxHash,
                message: `Across deposit ${response.status}`,
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
            throw new TrackingRefInvalidError("Across tracking requires TrackingRef type 'txHash'");
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
            message: "Deposit confirmed, tracking via Across API...",
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

    private validateSettler(to: Address, chainId: number): void {
        const knownSettler = ACROSS_ORIGIN_SETTLER_ADDRESSES[chainId];
        if (!knownSettler) return;

        if (getAddress(to) !== getAddress(knownSettler)) {
            throw new SettlerValidationError(
                `tx.to ${to} does not match known settler ${knownSettler} for chain ${chainId}`,
            );
        }
    }

    /**
     * Decode the SpokePool deposit calldata and verify it matches the
     * quote the user agreed to. Only validates simple bridges (no message).
     * Complex cross-chain swaps with a message payload are allowed through
     * because we can't know the destination DEX/protocol.
     */
    private validateCalldata(data: Hex, quote: SwapQuote, params: SwapQuoteRequest): void {
        const selector = slice(data, 0, 4);
        if (selector !== DEPOSIT_SELECTOR) return;

        let decoded: ReturnType<typeof decodeFunctionData>;
        try {
            decoded = decodeFunctionData({ abi: ACROSS_DEPOSIT_ABI, data });
        } catch {
            return;
        }

        const [
            depositor,
            recipient,
            inputToken,
            outputToken,
            inputAmount,
            _outputAmount,
            destinationChainId,
            _exclusiveRelayer,
            _quoteTimestamp,
            _fillDeadline,
            _exclusivityParameter,
            message,
        ] = decoded.args as readonly [
            Hex,
            Hex,
            Hex,
            Hex,
            bigint,
            bigint,
            bigint,
            Hex,
            number,
            number,
            number,
            Hex,
        ];

        if (message && message.length > 2) return;

        const fail = (reason: string) => {
            throw new PayloadValidationError(`Across calldata mismatch: ${reason}`);
        };

        if (!isAddressEqual(bytes32ToAddress(inputToken), quote.input.token as Address)) {
            fail(`inputToken ${bytes32ToAddress(inputToken)} vs quote ${quote.input.token}`);
        }
        if (!isAddressEqual(bytes32ToAddress(outputToken), quote.output.token as Address)) {
            fail(`outputToken ${bytes32ToAddress(outputToken)} vs quote ${quote.output.token}`);
        }
        if (inputAmount !== quote.input.amount) {
            fail(`inputAmount ${inputAmount} vs quote ${quote.input.amount}`);
        }
        if (destinationChainId !== BigInt(quote.output.chainId)) {
            fail(`destinationChainId ${destinationChainId} vs quote ${quote.output.chainId}`);
        }
        if (
            !isAddressEqual(
                bytes32ToAddress(recipient),
                (params.recipient ?? params.user) as Address,
            )
        ) {
            fail(
                `recipient ${bytes32ToAddress(recipient)} vs expected ${params.recipient ?? params.user}`,
            );
        }
        if (!isAddressEqual(bytes32ToAddress(depositor), params.user as Address)) {
            fail(`depositor ${bytes32ToAddress(depositor)} vs expected ${params.user}`);
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

    private toAcrossParams(params: SwapQuoteRequest): AcrossGetQuoteParams {
        const swapType = params.swapType ?? "exact-input";
        const amount =
            swapType === "exact-input"
                ? params.input.amount.toString()
                : (params.output.minAmount?.toString() ?? "0");

        return AcrossGetQuoteParamsSchema.parse({
            tradeType: swapType,
            inputToken: params.input.token,
            amount,
            outputToken: params.output.token,
            originChainId: params.input.chainId,
            destinationChainId: params.output.chainId,
            depositor: params.user,
            recipient: params.recipient ?? params.user,
        });
    }
}

function mapAcrossStatus(acrossStatus: string): SwapOrderStatus {
    switch (acrossStatus) {
        case "filled":
            return "finalized";
        case "expired":
            return "expired";
        case "refunded":
            return "refunded";
        case "pending":
        case "slowFillRequested":
        default:
            return "pending";
    }
}
