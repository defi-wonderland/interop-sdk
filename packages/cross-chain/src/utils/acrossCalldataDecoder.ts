import { decodeFunctionData, Hex, slice, toFunctionSelector } from "viem";

import {
    ACROSS_SPOKE_POOL_DEPOSIT_ABI,
    ACROSS_SPOKE_POOL_PERIPHERY_SWAP_AND_BRIDGE_ABI,
    bytes32ToAddress,
} from "../internal.js";

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
                error: `Unknown function selector: ${selector}`,
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

        return {
            success: true,
            functionName: "swapAndBridge",
            params: {
                inputToken: swapAndDepositData.swapToken.toLowerCase(),
                outputToken: bytes32ToAddress(depositData.outputToken),
                inputAmount: swapAndDepositData.swapTokenAmount,
                outputAmount: depositData.outputAmount,
                recipient: bytes32ToAddress(depositData.recipient),
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
