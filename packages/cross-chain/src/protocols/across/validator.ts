import type { GetQuoteRequest } from "@openintentsframework/oif-specs";
import type { Address, Hex } from "viem";
import { getAddress, getChainId } from "@wonderland/interop-addresses";
import { isAddressEqual } from "viem";

import { decodeAcrossCalldata, DecodedAcrossParams } from "./utils.js";

/**
 * Validates Across calldata matches user intent. Rejects anything we can't
 * fully audit: malformed calldata, non-deposit selectors, and deposits with
 * a non-empty message (complex routes whose destination handler we can't
 * verify against the user's intent).
 */
export async function validateAcrossPayload(
    userIntent: GetQuoteRequest,
    data: Hex,
): Promise<boolean> {
    if (!data) return false;

    const decodeResult = decodeAcrossCalldata(data);
    if (!decodeResult.success) return false;
    if (decodeResult.hasMessage) return false;

    return validateDecodedParams(userIntent, decodeResult.params);
}

async function validateDecodedParams(
    userIntent: GetQuoteRequest,
    calldata: DecodedAcrossParams,
): Promise<boolean> {
    const output = userIntent.intent.outputs[0];
    const input = userIntent.intent.inputs[0];
    if (!output || !input) return false;

    // Extract user's trusted data (source of truth)
    const trusted = {
        recipient: (await getAddress(output.receiver)) as Address,
        outputToken: (await getAddress(output.asset)) as Address,
        destinationChain: BigInt(await getChainId(output.asset)),
        depositor: (await getAddress(input.user)) as Address,
        inputToken: (await getAddress(input.asset)) as Address,
        inputAmount: input.amount !== undefined ? BigInt(input.amount) : undefined,
    };

    // Validate all fields for simple bridges
    if (!isAddressEqual(calldata.recipient as Address, trusted.recipient)) return false;
    if (!isAddressEqual(calldata.outputToken as Address, trusted.outputToken)) return false;
    if (calldata.destinationChainId !== trusted.destinationChain) return false;
    if (!isAddressEqual(calldata.depositor as Address, trusted.depositor)) return false;
    if (!isAddressEqual(calldata.inputToken as Address, trusted.inputToken)) return false;

    if (trusted.inputAmount !== undefined) {
        if (calldata.inputAmount !== trusted.inputAmount) return false;
    }

    return true;
}
