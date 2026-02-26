import { z } from "zod";

import { InteropAccountIdSchema } from "./interopAccountId.js";

// ── Steps ────────────────────────────────────────────────

export const TransactionStepSchema = z.object({
    kind: z.literal("transaction"),
    chainId: z.number().int().positive(),
    description: z.string().optional(),
    transaction: z.object({
        to: z.string(),
        data: z.string(),
        value: z.string().optional(),
        gas: z.string().optional(),
        maxFeePerGas: z.string().optional(),
        maxPriorityFeePerGas: z.string().optional(),
    }),
});

export const SignatureStepSchema = z.object({
    kind: z.literal("signature"),
    chainId: z.number().int().positive(),
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
                token: InteropAccountIdSchema,
                owner: z.string(),
                spender: z.string(),
                required: z.string(),
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
