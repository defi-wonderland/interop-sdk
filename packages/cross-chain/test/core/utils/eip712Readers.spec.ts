import { describe, expect, it } from "vitest";

import type { Eip712Envelope } from "../../../src/core/types/eip712.js";
import { PERMIT2_ADDRESS } from "../../../src/core/constants/eip712.js";
import { Eip712EnvelopeMismatch } from "../../../src/core/errors/Eip712EnvelopeMismatch.exception.js";
import { readAddressField } from "../../../src/core/utils/eip712Readers.js";

const PROVIDER = "test";
const TOKEN = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as `0x${string}`;
const RECEIVER = "0x52602D7cc3D833F5d28ee6D01C7F82C9b2322e10" as `0x${string}`;

function envelope(message: Record<string, unknown>): Eip712Envelope {
    return {
        domain: { chainId: 1, verifyingContract: PERMIT2_ADDRESS },
        primaryType: "PermitWitnessTransferFrom",
        types: {},
        message,
    };
}

describe("readAddressField", () => {
    it("returns the checksummed address and accepts a matching expected value", () => {
        const result = readAddressField({
            envelope: envelope({ witness: { receiver: RECEIVER.toLowerCase() } }),
            path: ["witness", "receiver"],
            field: "recipient",
            provider: PROVIDER,
            expected: RECEIVER,
        });
        expect(result).toBe(RECEIVER);
    });

    it("rejects an address that does not match the expected value", () => {
        expect(() =>
            readAddressField({
                envelope: envelope({ witness: { receiver: TOKEN } }),
                path: ["witness", "receiver"],
                field: "recipient",
                provider: PROVIDER,
                expected: RECEIVER,
            }),
        ).toThrow(Eip712EnvelopeMismatch);
    });

    it("rejects a missing path with a typed mismatch", () => {
        expect(() =>
            readAddressField({
                envelope: envelope({}),
                path: ["witness", "receiver"],
                field: "recipient",
                provider: PROVIDER,
                expected: RECEIVER,
            }),
        ).toThrow(Eip712EnvelopeMismatch);
    });
});
