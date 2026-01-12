/**
 * Decodes Across calldata to validate it matches user intent before signing.
 * Prevents attacks where malicious API returns calldata sending funds to attacker.
 *
 * - **deposit** (0xad5425c6): recipient directly in calldata
 * - **swapAndBridge** (0x110560ad): recipient in message via drainLeftoverTokens
 *
 * Security: validates all drainLeftoverTokens go to same recipient,
 * and fallbackRecipient matches (or is zero).
 *
 * TODO: Complex ops (bridge+Aave) with no drains AND fallback=zero return invalid.
 * @see https://docs.across.to/use-cases/embedded-cross-chain-actions
 */
import {
    decodeAbiParameters,
    decodeFunctionData,
    Hex,
    slice,
    toFunctionSelector,
    zeroAddress,
} from "viem";

import {
    ACROSS_DRAIN_LEFTOVER_TOKENS_ABI,
    ACROSS_MULTICALL_HANDLER_INSTRUCTIONS_ABI,
    ACROSS_SPOKE_POOL_DEPOSIT_ABI,
    ACROSS_SPOKE_POOL_PERIPHERY_SWAP_AND_BRIDGE_ABI,
    bytes32ToAddress,
} from "../internal.js";

const DRAIN_LEFTOVER_TOKENS_SELECTOR = toFunctionSelector(ACROSS_DRAIN_LEFTOVER_TOKENS_ABI[0]);

// Derive selectors from ABIs
const DEPOSIT_SELECTOR = toFunctionSelector(ACROSS_SPOKE_POOL_DEPOSIT_ABI[0]);
const SWAP_AND_BRIDGE_SELECTOR = toFunctionSelector(
    ACROSS_SPOKE_POOL_PERIPHERY_SWAP_AND_BRIDGE_ABI[0],
);

export interface DecodedAcrossParams {
    inputToken?: string;
    outputToken: string;
    inputAmount?: bigint;
    outputAmount: bigint;
    recipient: string;
    destinationChainId: bigint;
    depositor: string;
}

export type DecodeResult =
    | { success: true; params: DecodedAcrossParams; functionName: "deposit" | "swapAndBridge" }
    | { success: false; error: string };

export function decodeAcrossCalldata(data: Hex): DecodeResult {
    const selector = slice(data, 0, 4);

    switch (selector) {
        case DEPOSIT_SELECTOR:
            return decodeSpokePoolDeposit(data);
        case SWAP_AND_BRIDGE_SELECTOR:
            return decodePeripherySwapAndBridge(data);
        default:
            return {
                success: false,
                error: `Unknown Across selector: ${selector}. Expected deposit (${DEPOSIT_SELECTOR}) or swapAndBridge (${SWAP_AND_BRIDGE_SELECTOR}). Across API may have changed.`,
            };
    }
}

function decodeSpokePoolDeposit(data: Hex): DecodeResult {
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

        return {
            success: true,
            functionName: "deposit",
            params: {
                inputToken: bytes32ToAddress(inputToken),
                outputToken: bytes32ToAddress(outputToken),
                inputAmount,
                outputAmount,
                recipient: bytes32ToAddress(recipient),
                destinationChainId,
                depositor: bytes32ToAddress(depositor),
            },
        };
    } catch (e) {
        return {
            success: false,
            error: `Failed to decode deposit: ${e instanceof Error ? e.message : String(e)}`,
        };
    }
}

function decodePeripherySwapAndBridge(data: Hex): DecodeResult {
    try {
        const decoded = decodeFunctionData({
            abi: ACROSS_SPOKE_POOL_PERIPHERY_SWAP_AND_BRIDGE_ABI,
            data,
        });

        const [swapAndDepositData] = decoded.args;
        const depositData = swapAndDepositData.depositData;

        const recipient = extractRecipientFromMessage(depositData.message as Hex);
        if (!recipient) {
            return {
                success: false,
                error: "Failed to extract recipient from swapAndBridge message",
            };
        }

        return {
            success: true,
            functionName: "swapAndBridge",
            params: {
                inputToken: swapAndDepositData.swapToken.toLowerCase(),
                outputToken: bytes32ToAddress(depositData.outputToken),
                inputAmount: swapAndDepositData.swapTokenAmount,
                outputAmount: depositData.outputAmount,
                recipient,
                destinationChainId: depositData.destinationChainId,
                depositor: depositData.depositor.toLowerCase(),
            },
        };
    } catch (e) {
        return {
            success: false,
            error: `Failed to decode swapAndBridge: ${e instanceof Error ? e.message : String(e)}`,
        };
    }
}

/**
 * Extracts and validates the recipient from swapAndBridge message bytes.
 * The message contains MulticallHandler.Instructions with calls and fallbackRecipient.
 *
 * Security validations:
 * - ALL drainLeftoverTokens calls must have the same destination
 * - fallbackRecipient must match that destination (or be zero)
 *
 * Returns null if validation fails or no recipient found.
 */
function extractRecipientFromMessage(message: Hex): string | null {
    try {
        const [instructions] = decodeAbiParameters(
            ACROSS_MULTICALL_HANDLER_INSTRUCTIONS_ABI,
            message,
        );

        // Collect all drainLeftoverTokens destinations
        let recipient: string | null = null;
        for (const call of instructions.calls) {
            const selector = slice(call.callData as Hex, 0, 4);
            if (selector === DRAIN_LEFTOVER_TOKENS_SELECTOR) {
                const decoded = decodeFunctionData({
                    abi: ACROSS_DRAIN_LEFTOVER_TOKENS_ABI,
                    data: call.callData as Hex,
                });
                const [, destination] = decoded.args as [string, string];
                const destinationLower = destination.toLowerCase();

                if (destinationLower === zeroAddress) continue;

                // All drains must go to the same recipient
                if (recipient === null) {
                    recipient = destinationLower;
                } else if (recipient !== destinationLower) {
                    return null; // Multiple different recipients = invalid
                }
            }
        }

        const fallback = instructions.fallbackRecipient.toLowerCase();

        if (recipient === null) {
            return fallback !== zeroAddress ? fallback : null;
        }

        // fallbackRecipient must match recipient or be zero
        if (fallback !== zeroAddress && fallback !== recipient) {
            return null;
        }

        return recipient;
    } catch {
        return null;
    }
}
