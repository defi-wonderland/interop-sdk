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
 * Skipped when `allowDangerousParameters` is set.
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

function validateAmounts(params: BuildQuoteRequest): void {
    if (BigInt(params.input.amount) === 0n) {
        throw new ZeroAmount("input");
    }
    if (BigInt(params.output.amount) === 0n) {
        throw new ZeroAmount("output");
    }
}

function validateSameAssetRequired(relationship: AssetRelationship): void {
    if (relationship === "different") {
        throw new DifferentAssetNotAllowed();
    }
}

function validateFeeMargin(params: BuildQuoteRequest, relationship: AssetRelationship): void {
    if (relationship !== "same") return;

    if (BigInt(params.output.amount) >= BigInt(params.input.amount)) {
        throw new InsufficientFee(params.input.amount, params.output.amount);
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

// ── Asset classification ────────────────────────────────────────────

/**
 * Same chain: compare by address. Cross-chain: only "different" when symbols mismatch,
 * otherwise "unknown" (symbols alone can't prove sameness).
 */
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

function compareSameChainAssets(inputAddress: string, outputAddress: string): AssetRelationship {
    try {
        return isAddressEqual(inputAddress as Address, outputAddress as Address)
            ? "same"
            : "different";
    } catch {
        throw new UnsupportedAddress(`${inputAddress} or ${outputAddress}`);
    }
}

// TODO: Replace with a canonical asset identifier for reliable cross-chain detection.
function compareCrossChainAssets(
    inputChainId: number,
    inputAddress: string,
    outputChainId: number,
    outputAddress: string,
    tokenMetadata: Record<number, Record<string, { symbol: string }>>,
): AssetRelationship {
    const inputSymbol = tokenMetadata[inputChainId]?.[inputAddress.toLowerCase()]?.symbol;
    const outputSymbol = tokenMetadata[outputChainId]?.[outputAddress.toLowerCase()]?.symbol;

    if (inputSymbol !== undefined && outputSymbol !== undefined && inputSymbol !== outputSymbol) {
        return "different";
    }

    return "unknown";
}
