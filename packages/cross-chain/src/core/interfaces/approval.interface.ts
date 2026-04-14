import type { ExecutableQuote } from "../schemas/quote.js";

export interface ApprovalAmountStrategy {
    resolve(required: bigint): bigint;
}

export interface AllowanceEntry {
    chainId: number;
    tokenAddress: string;
    owner: string;
    spender: string;
}

export interface AllowanceResult {
    entry: AllowanceEntry;
    /** On-chain allowance, or `null` when the read failed. */
    allowance: bigint | null;
}

export interface AllowanceReader {
    readAllowances(entries: AllowanceEntry[]): Promise<AllowanceResult[]>;
}

export interface ApprovalService {
    enrichQuotes(quotes: ExecutableQuote[]): Promise<ExecutableQuote[]>;
}
