import { Address, encodeAbiParameters, encodeFunctionData, Hex, pad, zeroAddress } from "viem";

import {
    ACROSS_DRAIN_LEFTOVER_TOKENS_ABI,
    ACROSS_MULTICALL_HANDLER_INSTRUCTIONS_ABI,
    ACROSS_SPOKE_POOL_DEPOSIT_ABI,
} from "../../src/internal.js";

const MULTICALL_HANDLER = "0x0f7ae28de1c8532170ad4ee566b5801485c13a0e" as Address;

interface DrainCall {
    token: Address;
    destination: Address;
}

function encodeDrainCall(token: Address, destination: Address): Hex {
    return encodeFunctionData({
        abi: ACROSS_DRAIN_LEFTOVER_TOKENS_ABI,
        functionName: "drainLeftoverTokens",
        args: [token, destination],
    });
}

function encodeMessage(drains: DrainCall[], fallbackRecipient: Address): Hex {
    const calls = drains.map((drain) => ({
        target: MULTICALL_HANDLER,
        callData: encodeDrainCall(drain.token, drain.destination),
        value: 0n,
    }));

    return encodeAbiParameters(ACROSS_MULTICALL_HANDLER_INSTRUCTIONS_ABI, [
        {
            calls,
            fallbackRecipient,
        },
    ]);
}

interface DepositWithMessageParams {
    inputToken: Address;
    outputToken: Address;
    inputAmount: bigint;
    outputAmount: bigint;
    depositor: Address;
    destinationChainId: bigint;
    drains: DrainCall[];
    fallbackRecipient: Address;
}

/**
 * Encodes a deposit calldata with custom message (for testing recipient extraction)
 */
export function encodeDepositWithMessage(params: DepositWithMessageParams): Hex {
    const message = encodeMessage(params.drains, params.fallbackRecipient);

    return encodeFunctionData({
        abi: ACROSS_SPOKE_POOL_DEPOSIT_ABI,
        functionName: "deposit",
        args: [
            pad(params.depositor, { size: 32 }),
            pad(MULTICALL_HANDLER, { size: 32 }), // recipient is MulticallHandler
            pad(params.inputToken, { size: 32 }),
            pad(params.outputToken, { size: 32 }),
            params.inputAmount,
            params.outputAmount,
            params.destinationChainId,
            pad(zeroAddress, { size: 32 }), // exclusiveRelayer
            0, // quoteTimestamp
            0, // fillDeadline
            0, // exclusivityParameter
            message,
        ],
    });
}

// Test addresses
export const ATTACKER = "0x1234567890123456789012345678901234567890" as Address;
export const USER = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as Address;
export const OUTPUT_TOKEN = "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85" as Address;
export const INPUT_TOKEN = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as Address;
