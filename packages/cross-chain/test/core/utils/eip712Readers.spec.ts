import { describe, expect, it } from "vitest";

import type { Eip712Envelope } from "../../../src/core/types/eip712.js";
import { PERMIT2_ADDRESS } from "../../../src/core/constants/eip712.js";
import { Eip712EnvelopeMismatch } from "../../../src/core/errors/Eip712EnvelopeMismatch.exception.js";
import {
    assertEip3009DomainVersion,
    assertNotNativeAsset,
    readAddressField,
} from "../../../src/core/utils/eip712Readers.js";
import { NATIVE_ASSET_ADDRESS, NATIVE_ZERO_ADDRESS } from "../../../src/core/utils/token.js";

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

    it.each([
        ["missing path", {}],
        ["non-string value", { witness: { receiver: 42 } }],
        ["malformed address", { witness: { receiver: "not-an-address" } }],
        ["non-object intermediate", { witness: "not-an-object" }],
        ["address mismatch", { witness: { receiver: TOKEN } }],
    ])("throws Eip712EnvelopeMismatch on %s", (_, message) => {
        expect(() =>
            readAddressField({
                envelope: envelope(message),
                path: ["witness", "receiver"],
                field: "recipient",
                provider: PROVIDER,
                expected: RECEIVER,
            }),
        ).toThrow(Eip712EnvelopeMismatch);
    });
});

describe("assertNotNativeAsset", () => {
    it("passes for a non-native address and rejects every native placeholder", () => {
        expect(() =>
            assertNotNativeAsset({
                assetAddress: TOKEN,
                provider: PROVIDER,
                primaryType: "PermitTransferFrom",
                mechanism: "Permit2",
            }),
        ).not.toThrow();

        for (const native of [NATIVE_ASSET_ADDRESS, NATIVE_ZERO_ADDRESS]) {
            expect(() =>
                assertNotNativeAsset({
                    assetAddress: native,
                    provider: PROVIDER,
                    primaryType: "PermitTransferFrom",
                    mechanism: "Permit2",
                }),
            ).toThrow(Eip712EnvelopeMismatch);
        }
    });
});

describe("assertEip3009DomainVersion", () => {
    it("accepts a non-empty version and rejects missing or empty values", () => {
        const make = (version?: string): Eip712Envelope => ({
            domain: { chainId: 1, verifyingContract: TOKEN, version },
            primaryType: "TransferWithAuthorization",
            types: {},
            message: {},
        });
        expect(() => assertEip3009DomainVersion(make("2"), PROVIDER)).not.toThrow();
        for (const invalid of [undefined, ""]) {
            expect(() => assertEip3009DomainVersion(make(invalid), PROVIDER)).toThrow(
                Eip712EnvelopeMismatch,
            );
        }
    });
});
