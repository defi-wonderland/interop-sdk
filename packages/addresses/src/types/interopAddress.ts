import { z } from "zod";

import type { Checksum } from "./checksum.js";
import { interoperableAddressSchema } from "../schemas/interoperableAddress.schema.js";

/**
 * Canonical binary representation (EIP-7930 object)
 *
 * NOTE:
 * - This is the canonical binary representation used throughout the addresses package.
 * - It intentionally mirrors the existing `InteropAddress` zod schema so we can
 *   maintain a single source of truth for validation/layout.
 */
export type InteroperableAddress = z.infer<typeof interoperableAddressSchema>;

/**
 * Backwards-compatible alias for older naming.
 * New code should prefer `InteroperableAddress`.
 */
export type InteropAddress = InteroperableAddress;

export type ChainType = InteroperableAddress["chainType"];

export type ChainReference = InteroperableAddress["chainReference"];

export type Address = InteroperableAddress["address"];

/**
 * Canonical CAIP-350 structured text representation.
 *
 * This is the structured form used by the text layer. Human-readable
 * names are formatted on top of this (`InteroperableName`).
 *
 * Fields are optional per the spec - at least one of chainReference or address must be present.
 */
export type InteroperableAddressText = {
    version: number;
    chainType: "eip155" | "solana";
    chainReference?: string;
    address?: string;
};

/**
 * Canonical ERC-7828-style interoperable name representation.
 *
 * Example: `0xabc123...@eip155:1#4CA88C9C`
 */
export type InteroperableName = `${string}@${string}:${string}#${Checksum}`;
