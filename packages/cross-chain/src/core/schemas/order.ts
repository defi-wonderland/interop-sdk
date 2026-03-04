import { z } from "zod";

import { addressString, amountSchema, chainIdSchema } from "./common.js";

// ── Steps ────────────────────────────────────────────────

export const TransactionStepSchema = z.object({
    kind: z.literal("transaction"),
    chainId: chainIdSchema,
    description: z.string().optional(),
    transaction: z.object({
        to: addressString,
        data: z.string(),
        value: z.string().optional(),
        gas: z.string().optional(),
        maxFeePerGas: z.string().optional(),
        maxPriorityFeePerGas: z.string().optional(),
    }),
});

export const SignatureStepSchema = z.object({
    kind: z.literal("signature"),
    chainId: chainIdSchema,
    description: z.string().optional(),
    signaturePayload: z.object({
        signatureType: z.literal("eip712"),
        domain: z.record(z.unknown()),
        primaryType: z.string(),
        types: z.record(z.array(z.object({ name: z.string(), type: z.string() }))),
        message: z.record(z.unknown()),
    }),
    metadata: z.record(z.unknown()).optional(),
});

export const StepSchema = z.discriminatedUnion("kind", [
    TransactionStepSchema,
    SignatureStepSchema,
]);

// ── Lock ─────────────────────────────────────────────────

export const LockMechanismSchema = z.object({
    type: z.string(),
    contracts: z.array(z.string()).optional(),
});

// ── Checks ───────────────────────────────────────────────

export const OrderChecksSchema = z.object({
    allowances: z
        .array(
            z.object({
                chainId: chainIdSchema,
                tokenAddress: addressString,
                owner: addressString,
                spender: addressString,
                required: amountSchema,
            }),
        )
        .optional(),
});

// ── Order ────────────────────────────────────────────────

export const OrderSchema = z.object({
    steps: z.array(StepSchema).min(1),
    lock: LockMechanismSchema.optional(),
    checks: OrderChecksSchema.optional(),
    metadata: z.record(z.unknown()).optional(),
});

// ── Types ───────────────────────────────────────────────

export type TransactionStep = z.infer<typeof TransactionStepSchema>;
export type SignatureStep = z.infer<typeof SignatureStepSchema>;
export type Step = z.infer<typeof StepSchema>;
export type LockMechanism = z.infer<typeof LockMechanismSchema>;
export type OrderChecks = z.infer<typeof OrderChecksSchema>;
export type Order = z.infer<typeof OrderSchema>;
