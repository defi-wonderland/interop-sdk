/**
 * Decode an Across SpokePool `deposit` calldata so callers can match it
 * against the user's QuoteRequest. Non-deposit selectors are rejected; a
 * deposit with a non-empty message decodes normally and surfaces
 * `hasMessage: true` so the caller can decide whether to accept the route.
 */
import { decodeFunctionData, Hex, slice, toFunctionSelector } from "viem";

import { bytes32ToAddress } from "../../core/utils/addressHelpers.js";
import { ACROSS_SPOKE_POOL_DEPOSIT_ABI } from "./constants.js";

const DEPOSIT_SELECTOR = toFunctionSelector(ACROSS_SPOKE_POOL_DEPOSIT_ABI[0]);

export interface DecodedAcrossParams {
    depositor: string;
    recipient: string;
    inputToken: string;
    outputToken: string;
    inputAmount: bigint;
    outputAmount: bigint;
    destinationChainId: bigint;
}

export type DecodeResult =
    | { success: true; params: DecodedAcrossParams; hasMessage: boolean }
    | { success: false; reason: "invalid"; error: string };

const invalid = (error: string): DecodeResult => ({ success: false, reason: "invalid", error });

export function decodeAcrossCalldata(data: Hex): DecodeResult {
    if (!data || data.length < 10) {
        return invalid("Calldata is empty or shorter than a function selector.");
    }

    const selector = slice(data, 0, 4);
    if (selector !== DEPOSIT_SELECTOR) {
        return invalid(`Unexpected selector ${selector}; expected deposit ${DEPOSIT_SELECTOR}.`);
    }

    try {
        const { args } = decodeFunctionData({ abi: ACROSS_SPOKE_POOL_DEPOSIT_ABI, data });
        const [
            depositor,
            recipient,
            inputToken,
            outputToken,
            inputAmount,
            outputAmount,
            destinationChainId,
        ] = args;
        const message = args[11] as Hex;

        return {
            success: true,
            hasMessage: message.length > 2,
            params: {
                depositor: bytes32ToAddress(depositor).toLowerCase(),
                recipient: bytes32ToAddress(recipient).toLowerCase(),
                inputToken: bytes32ToAddress(inputToken).toLowerCase(),
                outputToken: bytes32ToAddress(outputToken).toLowerCase(),
                inputAmount,
                outputAmount,
                destinationChainId,
            },
        };
    } catch (e) {
        return invalid(`Failed to decode deposit: ${e instanceof Error ? e.message : String(e)}`);
    }
}
