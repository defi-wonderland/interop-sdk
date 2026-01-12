import { Address, encodeAbiParameters, encodeFunctionData, Hex, pad, zeroAddress } from "viem";

import {
    ACROSS_DRAIN_LEFTOVER_TOKENS_ABI,
    ACROSS_MULTICALL_HANDLER_INSTRUCTIONS_ABI,
    ACROSS_SPOKE_POOL_PERIPHERY_SWAP_AND_BRIDGE_ABI,
} from "../../src/internal.js";

const MULTICALL_HANDLER = "0x0f7ae28de1c8532170ad4ee566b5801485c13a0e" as Address;

interface DrainCall {
    token: Address;
    destination: Address;
}

/**
 * Encodes a drainLeftoverTokens call
 */
function encodeDrainCall(token: Address, destination: Address): Hex {
    return encodeFunctionData({
        abi: ACROSS_DRAIN_LEFTOVER_TOKENS_ABI,
        functionName: "drainLeftoverTokens",
        args: [token, destination],
    });
}

/**
 * Encodes MulticallHandler.Instructions message
 */
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

interface SwapAndBridgeParams {
    swapToken: Address;
    swapTokenAmount: bigint;
    outputToken: Address;
    outputAmount: bigint;
    depositor: Address;
    destinationChainId: bigint;
    drains: DrainCall[];
    fallbackRecipient: Address;
}

/**
 * Encodes a complete swapAndBridge calldata with custom message
 */
export function encodeSwapAndBridge(params: SwapAndBridgeParams): Hex {
    const message = encodeMessage(params.drains, params.fallbackRecipient);

    // Minimal swapAndBridge structure - only fields we need for validation
    const swapAndDepositData = {
        submissionFees: {
            amount: 0n,
            recipient: zeroAddress,
        },
        depositData: {
            inputToken: params.swapToken,
            outputToken: pad(params.outputToken, { size: 32 }),
            outputAmount: params.outputAmount,
            depositor: params.depositor,
            recipient: pad(MULTICALL_HANDLER, { size: 32 }),
            destinationChainId: params.destinationChainId,
            exclusiveRelayer: pad("0x00", { size: 32 }),
            quoteTimestamp: 0,
            fillDeadline: 0,
            exclusivityParameter: 0,
            message,
        },
        swapToken: params.swapToken,
        exchange: zeroAddress,
        transferType: 0,
        swapTokenAmount: params.swapTokenAmount,
        minExpectedInputTokenAmount: 0n,
        routerCalldata: "0x" as Hex,
        enableProportionalAdjustment: false,
        spokePool: zeroAddress,
        nonce: 0n,
    };

    return encodeFunctionData({
        abi: ACROSS_SPOKE_POOL_PERIPHERY_SWAP_AND_BRIDGE_ABI,
        functionName: "swapAndBridge",
        args: [swapAndDepositData],
    });
}

// Test addresses
export const ATTACKER = "0x1234567890123456789012345678901234567890" as Address;
export const USER = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as Address;
export const OUTPUT_TOKEN = "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85" as Address;
export const SWAP_TOKEN = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" as Address;
