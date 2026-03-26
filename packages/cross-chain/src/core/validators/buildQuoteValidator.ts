import type { Address } from "viem";
import { isAddressEqual } from "viem";

import type { BuildQuoteRequest } from "../schemas/quoteRequest.js";
import { DifferentAssetNotAllowed } from "../errors/DifferentAssetNotAllowed.exception.js";
import { InsufficientFee } from "../errors/InsufficientFee.exception.js";
import { InvalidDeadline } from "../errors/InvalidDeadline.exception.js";
import { UnsupportedAddress } from "../errors/UnsupportedAddress.exception.js";
import { ZeroAmount } from "../errors/ZeroAmount.exception.js";

/** Minimum seconds between now and fillDeadline. */
export const MIN_DEADLINE_BUFFER_SECONDS = 60;

type AssetRelationship = "same" | "different" | "unknown";

/**
 * Validates build-quote parameters for common safety issues.
 *
 * Skipped when `allowDangerousParameters` is set on the request.
 *
 * @param params - The build quote request to validate
 * @param tokenMetadata - Token metadata indexed by chainId then lowercase address (from asset discovery)
 * @param nowSeconds - Current unix timestamp in seconds (injectable for testing)
 * @throws ZeroAmount if input or output amount is zero
 * @throws DifferentAssetNotAllowed if input and output are different assets
 * @throws InsufficientFee if same-token output amount >= input amount
 * @throws InvalidDeadline if deadline is in the past or too soon
 */
export function validateBuildQuoteParams(
    params: BuildQuoteRequest,
    tokenMetadata: Record<number, Record<string, { symbol: string }>>,
    nowSeconds: number = Math.floor(Date.now() / 1000),
): void {
    if (params.allowDangerousParameters) return;

    const relationship = resolveAssetRelationship(
        params.input.chainId,
        params.input.assetAddress,
        params.output.chainId,
        params.output.assetAddress,
        tokenMetadata,
    );

    validateAmounts(params);
    validateSameAssetRequired(relationship);
    validateFeeMargin(params, relationship);
    validateDeadline(params.fillDeadline, nowSeconds);
}

// ── Individual validators ───────────────────────────────────────────

/** @throws ZeroAmount if input or output amount is zero. */
function validateAmounts(params: BuildQuoteRequest): void {
    if (BigInt(params.input.amount) === 0n) {
        throw new ZeroAmount("input");
    }
    if (BigInt(params.output.amount) === 0n) {
        throw new ZeroAmount("output");
    }
}

/** @throws DifferentAssetNotAllowed if assets are confirmed different. */
function validateSameAssetRequired(relationship: AssetRelationship): void {
    if (relationship === "different") {
        throw new DifferentAssetNotAllowed();
    }
}

/** @throws InsufficientFee if same-asset output amount >= input amount. */
function validateFeeMargin(params: BuildQuoteRequest, relationship: AssetRelationship): void {
    if (relationship !== "same") return;

    if (BigInt(params.output.amount) >= BigInt(params.input.amount)) {
        throw new InsufficientFee(params.input.amount, params.output.amount);
    }
}

/** @throws InvalidDeadline if deadline is in the past or too soon. */
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

// ── Asset classification ────────────────────────────────────────────

/** Same chain: compare by address. Cross-chain: compare by symbol, "unknown" if no metadata. */
function resolveAssetRelationship(
    inputChainId: number,
    inputAddress: string,
    outputChainId: number,
    outputAddress: string,
    tokenMetadata: Record<number, Record<string, { symbol: string }>>,
): AssetRelationship {
    if (inputChainId === outputChainId) {
        return compareSameChainAssets(inputAddress, outputAddress);
    }
    return compareCrossChainAssets(
        inputChainId,
        inputAddress,
        outputChainId,
        outputAddress,
        tokenMetadata,
    );
}

/** @throws UnsupportedAddress if addresses are not valid EVM addresses. */
function compareSameChainAssets(inputAddress: string, outputAddress: string): AssetRelationship {
    try {
        return isAddressEqual(inputAddress as Address, outputAddress as Address)
            ? "same"
            : "different";
    } catch {
        throw new UnsupportedAddress(`${inputAddress} or ${outputAddress}`);
    }
}

// TODO: Replace symbol comparison with a robust token pairing system.
function compareCrossChainAssets(
    inputChainId: number,
    inputAddress: string,
    outputChainId: number,
    outputAddress: string,
    tokenMetadata: Record<number, Record<string, { symbol: string }>>,
): AssetRelationship {
    const inputSymbol = tokenMetadata[inputChainId]?.[inputAddress.toLowerCase()]?.symbol;
    const outputSymbol = tokenMetadata[outputChainId]?.[outputAddress.toLowerCase()]?.symbol;

    if (inputSymbol === undefined || outputSymbol === undefined) return "unknown";
    return inputSymbol === outputSymbol ? "same" : "different";
}
