import { describe, expect, it } from "vitest";

import { Eip712EnvelopeMismatch } from "../../../src/core/errors/Eip712EnvelopeMismatch.exception.js";
import { assertNotExpired, assertNotPostDated } from "../../../src/core/utils/expiry.js";

const PROVIDER = "test";
const PRIMARY_TYPE = "PermitTransferFrom";
const FUTURE = Math.floor(Date.now() / 1000) + 3600;
const PAST = Math.floor(Date.now() / 1000) - 3600;

describe("assertNotExpired", () => {
    it("accepts a future timestamp supplied as number, bigint, or decimal string", () => {
        for (const ts of [FUTURE, BigInt(FUTURE), String(FUTURE)]) {
            expect(() =>
                assertNotExpired({
                    timestamp: ts,
                    provider: PROVIDER,
                    primaryType: PRIMARY_TYPE,
                }),
            ).not.toThrow();
        }
    });

    it.each([
        ["undefined", undefined],
        ["null", null],
        ["malformed string", "not-a-number"],
        ["zero", 0],
        ["negative", -1],
        ["fractional", 1.5],
        // EIP-712 timestamps are decimal-only on the wire; hex / whitespace / non-decimal
        // prefixes are tampering signals.
        ["hex string", "0x68aaaaaa"],
        ["whitespace-padded decimal", " 1700000000 "],
        ["uppercase 0X hex", "0X1"],
        ["binary prefix", "0b1"],
    ])("rejects %s as Eip712EnvelopeMismatch on field=deadline", (_, value) => {
        expect(() =>
            assertNotExpired({
                timestamp: value,
                provider: PROVIDER,
                primaryType: PRIMARY_TYPE,
            }),
        ).toThrow(Eip712EnvelopeMismatch);
    });

    it("rejects an expired timestamp", () => {
        expect(() =>
            assertNotExpired({
                timestamp: PAST,
                provider: PROVIDER,
                primaryType: PRIMARY_TYPE,
            }),
        ).toThrowError(/deadline/);
    });

    it("respects a custom skewSeconds tolerance", () => {
        const justPast = Math.floor(Date.now() / 1000) - 5;
        expect(() =>
            assertNotExpired({
                timestamp: justPast,
                provider: PROVIDER,
                primaryType: PRIMARY_TYPE,
                skewSeconds: 60,
            }),
        ).not.toThrow();
        expect(() =>
            assertNotExpired({
                timestamp: justPast,
                provider: PROVIDER,
                primaryType: PRIMARY_TYPE,
                skewSeconds: 0,
            }),
        ).toThrowError(/deadline/);
    });
});

describe("assertNotPostDated", () => {
    it("accepts validAfter=0 (immediately valid) and a past timestamp", () => {
        for (const ts of [0, 0n, "0", PAST, BigInt(PAST), String(PAST)]) {
            expect(() =>
                assertNotPostDated({
                    timestamp: ts,
                    provider: PROVIDER,
                    primaryType: PRIMARY_TYPE,
                }),
            ).not.toThrow();
        }
    });

    it("rejects a validAfter set in the future beyond the skew tolerance", () => {
        expect(() =>
            assertNotPostDated({
                timestamp: FUTURE,
                provider: PROVIDER,
                primaryType: PRIMARY_TYPE,
            }),
        ).toThrowError(/validAfter is in the future/);
    });

    it("respects a custom skewSeconds tolerance on the upper bound", () => {
        const nearFuture = Math.floor(Date.now() / 1000) + 5;
        expect(() =>
            assertNotPostDated({
                timestamp: nearFuture,
                provider: PROVIDER,
                primaryType: PRIMARY_TYPE,
                skewSeconds: 60,
            }),
        ).not.toThrow();
        expect(() =>
            assertNotPostDated({
                timestamp: nearFuture,
                provider: PROVIDER,
                primaryType: PRIMARY_TYPE,
                skewSeconds: 0,
            }),
        ).toThrowError(/validAfter/);
    });

    it("rejects malformed input as Eip712EnvelopeMismatch", () => {
        for (const value of ["not-a-number", -1, 1.5]) {
            expect(() =>
                assertNotPostDated({
                    timestamp: value,
                    provider: PROVIDER,
                    primaryType: PRIMARY_TYPE,
                }),
            ).toThrow(Eip712EnvelopeMismatch);
        }
    });
});
