import type { Address } from "viem";

import type { OrderChecks } from "../schemas/order.js";
import type { ExecutableQuote } from "../schemas/quote.js";

/** Strategy that decides which amount to encode in an ERC-20 `approve` call. */
export interface ApprovalAmountStrategy {
    resolve(required: bigint): bigint;
}

/** Identifies a unique ERC-20 allowance slot on a given chain. */
export interface AllowanceEntry {
    chainId: number;
    tokenAddress: Address;
    owner: Address;
    spender: Address;
}

/** On-chain ERC-20 allowance, or `null` when the read failed. */
export type Allowance = bigint | null;

/** Pair of a slot and the allowance currently held by it on-chain. */
export interface AllowanceResult {
    entry: AllowanceEntry;
    allowance: Allowance;
}

/** Allowance slot plus the amount required by an order's checks. */
export type AllowanceCheck = NonNullable<OrderChecks["allowances"]>[number];

/** Fast lookup from a composite allowance key to its on-chain value. */
export type AllowanceLookup = Record<string, Allowance | undefined>;

/** Reads ERC-20 allowances for a batch of slots, preserving input order. */
export interface AllowanceReader {
    readAllowances(entries: AllowanceEntry[]): Promise<AllowanceResult[]>;
}

/**
 * Payload for a failed allowance batch read.
 *
 * The `reason` splits chain-registry misses (`unknown-chain`) from RPC or
 * multicall errors (`multicall`). Single probe reverts are not reported
 * here; they show up as `null` allowances on the affected entries.
 */
export interface ApprovalReadFailure {
    chainId: number;
    reason: "multicall" | "unknown-chain";
    error: unknown;
}

/** Enriches executable quotes with ERC-20 approval steps when needed. */
export interface ApprovalService {
    enrichQuotes(quotes: ExecutableQuote[]): Promise<ExecutableQuote[]>;
}

// ── Utilities ────────────────────────────────────────────

/** Builds a composite key that uniquely identifies an allowance slot. */
export function allowanceKey(e: {
    chainId: number;
    tokenAddress: string;
    owner: string;
    spender: string;
}): string {
    return `${e.chainId}:${e.tokenAddress.toLowerCase()}:${e.owner.toLowerCase()}:${e.spender.toLowerCase()}`;
}

/** Converts a schema-derived `AllowanceCheck` (string addresses) to a typed `AllowanceEntry`. */
export function toAllowanceEntry(check: AllowanceCheck): AllowanceEntry {
    return {
        chainId: check.chainId,
        tokenAddress: check.tokenAddress as Address,
        owner: check.owner as Address,
        spender: check.spender as Address,
    };
}
