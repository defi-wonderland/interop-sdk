import type { Address } from "viem";
import { isAddressEqual } from "viem";

import type { BuildQuoteRequest } from "../schemas/quoteRequest.js";
import { InsufficientFee } from "../errors/InsufficientFee.exception.js";
import { InvalidDeadline } from "../errors/InvalidDeadline.exception.js";
import { UnsupportedAddress } from "../errors/UnsupportedAddress.exception.js";
import { ZeroAmount } from "../errors/ZeroAmount.exception.js";

/** Minimum seconds between now and fillDeadline. */
export const MIN_DEADLINE_BUFFER_SECONDS = 60;

/**
 * Validates build-quote parameters for common safety issues.
 *
 * Skipped when `allowDangerousParameters` is set on the request.
 *
 * @param params - The build quote request to validate
 * @param tokenMetadata - Token metadata indexed by chainId then lowercase address (from asset discovery)
 * @param nowSeconds - Current unix timestamp in seconds (injectable for testing)
 * @throws ZeroAmount if input or output amount is zero
 * @throws InsufficientFee if same-token output amount >= input amount
 * @throws InvalidDeadline if deadline is in the past or too soon
 */
export function validateBuildQuoteParams(
    params: BuildQuoteRequest,
    tokenMetadata: Record<number, Record<string, { symbol: string }>>,
    nowSeconds: number = Math.floor(Date.now() / 1000),
): void {
    if (params.allowDangerousParameters) return;

    validateAmounts(params);
    validateFeeMargin(params, tokenMetadata);
    validateDeadline(params.fillDeadline, nowSeconds);
}

function validateAmounts(params: BuildQuoteRequest): void {
    if (BigInt(params.input.amount) === 0n) {
        throw new ZeroAmount("input");
    }
    if (BigInt(params.output.amount) === 0n) {
        throw new ZeroAmount("output");
    }
}

function validateFeeMargin(
    params: BuildQuoteRequest,
    tokenMetadata: Record<number, Record<string, { symbol: string }>>,
): void {
    if (
        isSameAsset(
            params.input.chainId,
            params.input.assetAddress,
            params.output.chainId,
            params.output.assetAddress,
            tokenMetadata,
        )
    ) {
        if (BigInt(params.output.amount) >= BigInt(params.input.amount)) {
            throw new InsufficientFee(params.input.amount, params.output.amount);
        }
    }
}

/** Same chain: compare by address. Cross chain: compare by symbol (best-effort). */
function isSameAsset(
    inputChainId: number,
    inputAddress: string,
    outputChainId: number,
    outputAddress: string,
    tokenMetadata: Record<number, Record<string, { symbol: string }>>,
): boolean {
    if (inputChainId === outputChainId) {
        try {
            return isAddressEqual(inputAddress as Address, outputAddress as Address);
        } catch {
            throw new UnsupportedAddress(`${inputAddress} or ${outputAddress}`);
        }
    }

    // TODO: Replace with a robust token pairing system (valuable for Universal Balances)
    const inputSymbol = tokenMetadata[inputChainId]?.[inputAddress.toLowerCase()]?.symbol;
    const outputSymbol = tokenMetadata[outputChainId]?.[outputAddress.toLowerCase()]?.symbol;

    return inputSymbol !== undefined && inputSymbol === outputSymbol;
}

function validateDeadline(fillDeadline: number, nowSeconds: number): void {
    if (fillDeadline <= nowSeconds) {
        throw new InvalidDeadline(fillDeadline, nowSeconds, "past");
    }
    if (fillDeadline - nowSeconds < MIN_DEADLINE_BUFFER_SECONDS) {
        throw new InvalidDeadline(
            fillDeadline,
            nowSeconds,
            "too-soon",
            MIN_DEADLINE_BUFFER_SECONDS,
        );
    }
}
