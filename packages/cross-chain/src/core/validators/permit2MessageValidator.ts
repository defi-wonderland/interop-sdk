import { isAddressEqual } from "viem";

import type { Eip712Envelope, ExpectedPermit2Message } from "../types/eip712.js";
import { Eip712EnvelopeMismatch } from "../errors/Eip712EnvelopeMismatch.exception.js";
import { readAddressField } from "../utils/eip712Readers.js";
import { assertNotExpired } from "../utils/expiry.js";
import { readPermittedEntries } from "../utils/permit2.js";

/** Validate `permitted[]`, `spender`, optional token/amount caps, and `deadline` freshness. */
export function validatePermit2Message(
    envelope: Eip712Envelope,
    expected: ExpectedPermit2Message,
): void {
    const entries = readPermittedEntries(envelope);
    if (entries.length === 0) {
        throw new Eip712EnvelopeMismatch({
            field: "structure",
            provider: expected.provider,
            primaryType: envelope.primaryType,
            cause: "permitted entries missing or empty",
        });
    }

    readAddressField({
        envelope,
        path: ["spender"],
        field: "spender",
        provider: expected.provider,
        expected: expected.spender,
    });

    if (expected.inputToken !== undefined) {
        const target = expected.inputToken;
        const mismatched = entries.find((entry) => !isAddressEqual(entry.token, target));
        if (mismatched) {
            throw new Eip712EnvelopeMismatch({
                field: "token",
                provider: expected.provider,
                primaryType: envelope.primaryType,
                expected: target,
                received: mismatched.token,
            });
        }
    }

    if (expected.maxAmount !== undefined) {
        const total = entries.reduce((sum, entry) => sum + entry.amount, 0n);
        if (total > expected.maxAmount) {
            throw new Eip712EnvelopeMismatch({
                field: "amount",
                provider: expected.provider,
                primaryType: envelope.primaryType,
                expected: expected.maxAmount,
                received: total,
            });
        }
    }

    assertNotExpired({
        timestamp: envelope.message.deadline,
        skewSeconds: expected.skewSeconds,
        provider: expected.provider,
        primaryType: envelope.primaryType,
    });
}
