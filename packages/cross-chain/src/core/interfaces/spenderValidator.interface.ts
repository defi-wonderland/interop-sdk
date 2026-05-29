import type { Quote } from "../schemas/quote.js";

/** A solver-returned target (spender, transaction `to`, or signature counterparty) that failed validation. */
export interface SpenderViolation {
    chainId: number;
    field: "spender" | "transactionTo" | "signatureRecipient";
    received: string;
    trusted: string[];
}

/** Decides whether a quote's spender and transaction targets are trusted. */
export interface SpenderValidator {
    findViolation(quote: Quote): SpenderViolation | null;
}
