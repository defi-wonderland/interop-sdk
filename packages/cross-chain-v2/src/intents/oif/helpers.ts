import type { GetQuoteRequest, Quote } from "@openintentsframework/oif-specs";
import type { Address, Hex } from "viem";
import { decodeAddress, encodeAddress } from "@wonderland/interop-addresses";

import type { SwapOrderStatus, SwapQuote, SwapQuoteRequest } from "../../types/swap.js";

export function toInteropAddress(address: Address, chainId: number): string {
    return encodeAddress(
        {
            version: 1,
            chainType: "eip155",
            chainReference: chainId.toString(),
            address,
        },
        { format: "hex" },
    ) as string;
}

export function fromInteropAddress(interop: string): { address: Address; chainId: number } {
    const decoded = decodeAddress(interop as Hex);
    if (!decoded.address || !decoded.chainReference) {
        throw new Error(`Invalid interop address: ${interop}`);
    }
    return {
        address: decoded.address as Address,
        chainId: Number(decoded.chainReference),
    };
}

export function swapRequestToOifRequest(
    params: SwapQuoteRequest,
    supportedTypes: string[],
): GetQuoteRequest {
    const userInterop = toInteropAddress(params.user, params.input.chainId);
    return {
        user: userInterop,
        intent: {
            intentType: "oif-swap",
            inputs: [
                {
                    asset: toInteropAddress(params.input.token, params.input.chainId),
                    amount: params.input.amount.toString(),
                    user: userInterop,
                },
            ],
            outputs: [
                {
                    asset: toInteropAddress(params.output.token, params.output.chainId),
                    amount: params.output.minAmount?.toString() ?? "0",
                    receiver: toInteropAddress(
                        params.recipient ?? params.user,
                        params.output.chainId,
                    ),
                },
            ],
            swapType: params.swapType ?? "exact-input",
        },
        supportedTypes,
    } as GetQuoteRequest;
}

export function oifQuoteToSwapQuote(
    quote: Quote,
    protocol: string,
    variant: string,
    submission: "tx" | "sign",
    quoteId: string,
): SwapQuote {
    const input = quote.preview.inputs[0]!;
    const output = quote.preview.outputs[0]!;
    const inputDecoded = fromInteropAddress(input.asset);
    const outputDecoded = fromInteropAddress(output.asset);

    const swapQuote: SwapQuote = {
        quoteId,
        protocol,
        variant,
        submission,
        input: {
            chainId: inputDecoded.chainId,
            token: inputDecoded.address,
            amount: BigInt(input.amount ?? "0"),
        },
        output: {
            chainId: outputDecoded.chainId,
            token: outputDecoded.address,
            amount: BigInt(output.amount ?? "0"),
        },
        eta: quote.eta,
        expiry: quote.validUntil,
    };

    if (submission === "sign" && "payload" in quote.order) {
        const payload = quote.order.payload as Record<string, unknown>;
        swapQuote.signPayload = {
            domain: payload.domain as Record<string, unknown>,
            types: payload.types as Record<string, Array<{ name: string; type: string }>>,
            primaryType: payload.primaryType as string,
            message: payload.message as Record<string, unknown>,
        };
    }

    return swapQuote;
}

const STATUS_MAP: Record<string, SwapOrderStatus> = {
    pending: "pending",
    executing: "filling",
    executed: "filled",
    settling: "settled",
    settled: "settled",
    finalized: "finalized",
    failed: "failed",
    refunded: "refunded",
};

export function mapOifStatus(oifStatus: string): SwapOrderStatus {
    return STATUS_MAP[oifStatus] ?? "pending";
}

export { isTerminalStatus, nowSeconds, sleep } from "../../utils.js";
