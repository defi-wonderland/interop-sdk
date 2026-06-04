import type { Quote } from "../schemas/quote.js";

/** A solver-returned target (spender, transaction `to`, or signature counterparty) that failed validation. */
export interface SpenderViolation {
    chainId: number;
    field: "spender" | "transactionTo" | "signatureRecipient";
    received: string;
    trusted: string[];
}

/** Validates a quote's spender and transaction targets against a consumer-owned trusted list; the SDK doesn't maintain protocol deployment addresses, so the consumer owns and maintains it. */
export interface SpenderValidator {
    findViolation(quote: Quote): SpenderViolation | null;
}
