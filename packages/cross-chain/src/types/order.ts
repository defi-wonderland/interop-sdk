import type { InteropAccountId } from "./interopAccountId.js";

// ── Steps ────────────────────────────────────────────────

/** A step the user must execute — either sign typed data or send a transaction. */
export type Step = TransactionStep | SignatureStep;

/** Send a transaction on-chain. */
export interface TransactionStep {
    kind: "transaction";
    /** Chain where the transaction must be submitted */
    chainId: number;
    /** Human-readable explanation (e.g. "Approve USDC spend") */
    description?: string;
    /** Transaction parameters */
    transaction: {
        to: string;
        data: string;
        value?: string;
        gas?: string;
        maxFeePerGas?: string;
        maxPriorityFeePerGas?: string;
    };
}

/** Sign an EIP-712 typed-data payload. */
export interface SignatureStep {
    kind: "signature";
    /** Chain context for the signature (matches EIP-712 domain chainId) */
    chainId: number;
    /** Human-readable explanation (e.g. "Sign Permit2 transfer") */
    description?: string;
    /** EIP-712 typed data to sign */
    signaturePayload: {
        signatureType: "eip712";
        domain: Record<string, unknown>;
        primaryType: string;
        types: Record<string, Array<{ name: string; type: string }>>;
        message: Record<string, unknown>;
    };
    /** Protocol-specific metadata (e.g. EIP-3009 nonce preimage) */
    metadata?: Record<string, unknown>;
}

// ── Lock ─────────────────────────────────────────────────

/** How assets are secured — orthogonal to authorization method. */
export interface LockMechanism {
    type: "oif-escrow" | "compact-resource-lock" | (string & Record<never, never>);
    contracts?: string[];
}

// ── Checks ───────────────────────────────────────────────

/** Pre-conditions the user/SDK must verify before executing steps. */
export interface OrderChecks {
    allowances?: Array<{
        token: InteropAccountId;
        owner: string;
        spender: string;
        required: string;
    }>;
}

// ── Order ────────────────────────────────────────────────

/**
 * A unified order describing what the user must do to execute a cross-chain intent.
 *
 * Steps are ordered — execute sequentially from index 0.
 */
export interface Order {
    /** Ordered list of user actions (sign or send tx) */
    steps: Step[];
    /** How assets are secured (escrow, resource lock, etc.) */
    lock?: LockMechanism;
    /** Pre-conditions to verify (allowances, etc.) */
    checks?: OrderChecks;
    /** Opaque provider metadata */
    metadata?: Record<string, unknown>;
}
