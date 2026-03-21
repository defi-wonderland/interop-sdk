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
 * @param params - The build quote request to validate
 * @param nowSeconds - Current unix timestamp in seconds (injectable for testing)
 * @throws ZeroAmount if input or output amount is zero
 * @throws InsufficientFee if same-token output amount >= input amount
 * @throws InvalidDeadline if deadline is in the past or too soon
 */
export function validateBuildQuoteParams(
    params: BuildQuoteRequest,
    nowSeconds: number = Math.floor(Date.now() / 1000),
): void {
    validateAmounts(params);
    validateFeeMargin(params);
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

function validateFeeMargin(params: BuildQuoteRequest): void {
    const isSameChain = params.input.chainId === params.output.chainId;
    if (!isSameChain) return;

    if (isSameAsset(params.input.assetAddress, params.output.assetAddress)) {
        if (BigInt(params.output.amount) >= BigInt(params.input.amount)) {
            throw new InsufficientFee(params.input.amount, params.output.amount);
        }
    }
}

function isSameAsset(a: string, b: string): boolean {
    try {
        return isAddressEqual(a as Address, b as Address);
    } catch {
        throw new UnsupportedAddress(`${a} or ${b}`);
    }
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
