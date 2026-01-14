/**
 * Decodes Across deposit calldata to validate user intent.
 *
 * Only supports simple same-token bridges (deposit without message).
 * Complex operations (destination swaps, DeFi actions) have a message
 * that we can't validate - we don't know which DEX/protocol will be used.
 */
import { decodeFunctionData, Hex, slice, toFunctionSelector } from "viem";

import { ACROSS_SPOKE_POOL_DEPOSIT_ABI, bytes32ToAddress } from "../internal.js";

const DEPOSIT_SELECTOR = toFunctionSelector(ACROSS_SPOKE_POOL_DEPOSIT_ABI[0]);

export interface DecodedAcrossParams {
    inputToken: string;
    outputToken: string;
    inputAmount: bigint;
    outputAmount: bigint;
    recipient: string;
    destinationChainId: bigint;
    depositor: string;
}

export type DecodeResult =
    | { success: true; params: DecodedAcrossParams }
    | { success: false; reason: "unsupported" | "invalid"; error: string };

export function decodeAcrossCalldata(data: Hex): DecodeResult {
    const selector = slice(data, 0, 4);

    if (selector !== DEPOSIT_SELECTOR) {
        return {
            success: false,
            reason: "unsupported",
            error: `Unsupported selector: ${selector}. Only deposit (${DEPOSIT_SELECTOR}) is supported.`,
        };
    }

    try {
        const decoded = decodeFunctionData({
            abi: ACROSS_SPOKE_POOL_DEPOSIT_ABI,
            data,
        });

        const [
            depositor,
            recipient,
            inputToken,
            outputToken,
            inputAmount,
            outputAmount,
            destinationChainId,
        ] = decoded.args;
        const message = decoded.args[11] as Hex;

        // Only support simple bridges (no message)
        // Complex operations have a message with DEX/protocol calls we can't validate
        const hasMessage = message && message.length > 2;
        if (hasMessage) {
            return {
                success: false,
                reason: "unsupported",
                error: "Deposit with message not supported. Cannot validate complex operations.",
            };
        }

        return {
            success: true,
            params: {
                inputToken: bytes32ToAddress(inputToken).toLowerCase(),
                outputToken: bytes32ToAddress(outputToken).toLowerCase(),
                inputAmount,
                outputAmount,
                recipient: bytes32ToAddress(recipient).toLowerCase(),
                destinationChainId,
                depositor: bytes32ToAddress(depositor).toLowerCase(),
            },
        };
    } catch (e) {
        return {
            success: false,
            reason: "invalid",
            error: `Failed to decode deposit: ${e instanceof Error ? e.message : String(e)}`,
        };
    }
}
