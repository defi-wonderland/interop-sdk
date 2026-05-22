import { describe, expect, it } from "vitest";

import { Eip712EnvelopeMismatch } from "../../../src/core/errors/Eip712EnvelopeMismatch.exception.js";
import { assertNotExpired } from "../../../src/core/utils/expiry.js";

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
