import type { BuildQuoteRequest } from "../schemas/quoteRequest.js";
import { DifferentAssetNotAllowed } from "../errors/DifferentAssetNotAllowed.exception.js";
import { InsufficientFee } from "../errors/InsufficientFee.exception.js";
import { InvalidDeadline } from "../errors/InvalidDeadline.exception.js";
import { SameChainIntentNotAllowed } from "../errors/SameChainIntentNotAllowed.exception.js";
import { UnsupportedAsset } from "../errors/UnsupportedAsset.exception.js";
import { ZeroAmount } from "../errors/ZeroAmount.exception.js";
import { toCanonicalNativeAddress } from "../utils/token.js";

/** Minimum seconds between now and fillDeadline. */
export const MIN_DEADLINE_BUFFER_SECONDS = 60;

type AssetRelationship = "same" | "different" | "unknown";

type SameAssetMetadata = { symbol: string; decimals: number; providers: string[] };
type SameAssetMetadataByChain = Record<number, Record<string, SameAssetMetadata>>;

/**
 * Validates build-quote parameters for common safety issues.
 *
 * Skipped when `allowDangerousParameters` is set on the request.
 *
 * @param params - The build quote request to validate
 * @param tokenMetadata - Token metadata indexed by chainId then lowercase address (from asset discovery)
 * @param nowSeconds - Current unix timestamp in seconds (injectable for testing)
 * @throws ZeroAmount if input or output amount is zero
 * @throws InvalidDeadline if deadline is in the past or too soon
 * @throws SameChainIntentNotAllowed if input and output are on the same chain
 * @throws DifferentAssetNotAllowed if input and output are different assets or metadata is unavailable
 * @throws InsufficientFee if same-token output amount >= input amount
 */
export function validateBuildQuoteParams(
    params: BuildQuoteRequest,
    tokenMetadata: SameAssetMetadataByChain,
    nowSeconds: number = Math.floor(Date.now() / 1000),
): void {
    if (params.allowDangerousParameters) return;

    validateAmounts(params);
    validateDeadline(params.fillDeadline, nowSeconds);
    validateNotSameChain(params.input.chainId, params.output.chainId);

    const relationship = resolveAssetRelationship(
        params.input.chainId,
        params.input.assetAddress,
        params.output.chainId,
        params.output.assetAddress,
        tokenMetadata,
    );

    validateSameAssetRequired(relationship);
    validateFeeMargin(params);
}

// ── Validators (same order as called above) ─────────────────────────

/** @throws ZeroAmount if input or output amount is zero. */
function validateAmounts(params: BuildQuoteRequest): void {
    if (BigInt(params.input.amount) === 0n) {
        throw new ZeroAmount("input");
    }
    if (BigInt(params.output.amount) === 0n) {
        throw new ZeroAmount("output");
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

/** @throws SameChainIntentNotAllowed if input and output are on the same chain. */
function validateNotSameChain(inputChainId: number, outputChainId: number): void {
    if (inputChainId === outputChainId) {
        throw new SameChainIntentNotAllowed();
    }
}

/** @throws DifferentAssetNotAllowed if assets are confirmed different or metadata is unavailable. */
function validateSameAssetRequired(relationship: AssetRelationship): void {
    if (relationship !== "same") {
        throw new DifferentAssetNotAllowed();
    }
}

/** @throws InsufficientFee if same-asset output amount >= input amount. */
function validateFeeMargin(params: BuildQuoteRequest): void {
    if (BigInt(params.output.amount) >= BigInt(params.input.amount)) {
        throw new InsufficientFee(params.input.amount, params.output.amount);
    }
}

// ── Asset classification ────────────────────────────────────────────

/** Same-asset iff input and output share symbol, decimals, and a provider that lists both. */
function resolveAssetRelationship(
    inputChainId: number,
    inputAddress: string,
    outputChainId: number,
    outputAddress: string,
    tokenMetadata: SameAssetMetadataByChain,
): AssetRelationship {
    const input = tokenMetadata[inputChainId]?.[toCanonicalNativeAddress(inputAddress, "eip155")];
    const output =
        tokenMetadata[outputChainId]?.[toCanonicalNativeAddress(outputAddress, "eip155")];

    if (input === undefined || output === undefined) return "unknown";

    const sameIdentity = input.symbol === output.symbol && input.decimals === output.decimals;
    const sharedProvider = input.providers.some((provider) => output.providers.includes(provider));

    return sameIdentity && sharedProvider ? "same" : "different";
}

// ── Asset support ──────────────────────────────────────────────────

/**
 * Validates that the provider supports the requested assets.
 *
 * Skipped when `allowDangerousParameters` is set on the request.
 *
 * @param params - The build quote request to validate
 * @param providerId - The provider being targeted
 * @param isSupported - Pre-resolved result from the discovery cache
 * @throws UnsupportedAsset if the provider does not support the requested asset
 */
export function validateAssetSupport(
    params: BuildQuoteRequest,
    providerId: string,
    isSupported: boolean,
): void {
    if (params.allowDangerousParameters) return;

    if (!isSupported) {
        throw new UnsupportedAsset(providerId, params.input, params.output);
    }
}
