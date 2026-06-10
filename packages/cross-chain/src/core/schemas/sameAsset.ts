import type { Address, Chain } from "viem";
import { z } from "zod";

import { addressString, chainIdSchema } from "./common.js";

/** Chain id, anchored to viem's `Chain` definition (structurally `number`). */
export type ChainId = Chain["id"];

/** Stable, consumer-chosen identifier shared by every address of one asset. */
export type AssetId = string;

/**
 * Consumer-owned same-asset map: `assetId -> chainId -> token address`.
 *
 * Two addresses are the same asset when they map to the same `assetId`. The SDK
 * ships no entries and maintains no list — the pairings are the consumer's to
 * provide and keep up to date.
 */
export type SameAssetMap = Readonly<Record<AssetId, Readonly<Record<ChainId, Address>>>>;

/** Runtime schema for a {@link SameAssetMap}: chain keys are coerced to chain ids, values validated as hex addresses. */
export const SameAssetMapSchema = z.record(
    z.string().min(1, "assetId must be a non-empty string"),
    z.record(z.coerce.number().pipe(chainIdSchema), addressString),
);
