import type { Address } from "viem";
import { afterEach, describe, expect, it, vi } from "vitest";

import { extractPermit2Allowances } from "../../src/protocols/oif/adapters/permit2AllowanceExtractor.js";

const SIGNER = "0x0000000000000000000000000000000000000001" as Address;
const TOKEN_A = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const TOKEN_B = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
const SETTLER = "0x1234567890abcdef1234567890abcdef12345678";

interface Payload {
    domain: Record<string, unknown>;
    primaryType: string;
    message: Record<string, unknown>;
}

function basePayload(overrides?: {
    primaryType?: string;
    message?: Record<string, unknown>;
}): Payload {
    return {
        domain: { name: "Permit2", chainId: 1, verifyingContract: PERMIT2 },
        primaryType: overrides?.primaryType ?? "PermitBatchWitnessTransferFrom",
        message: overrides?.message ?? {
            permitted: [{ token: TOKEN_A, amount: "1000000" }],
            spender: SETTLER,
            nonce: "123",
            deadline: "1700000000",
        },
    };
}

describe("extractPermit2Allowances", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("extracts a single allowance for PermitBatchWitnessTransferFrom", () => {
        const result = extractPermit2Allowances(basePayload(), SIGNER);

        expect(result).toEqual([
            {
                chainId: 1,
                tokenAddress: TOKEN_A,
                owner: SIGNER,
                spender: PERMIT2,
                required: "1000000",
                preferInfinite: true,
            },
        ]);
    });

    it("extracts batch allowances with one entry per unique token", () => {
        const result = extractPermit2Allowances(
            basePayload({
                message: {
                    permitted: [
                        { token: TOKEN_A, amount: "1000000" },
                        { token: TOKEN_B, amount: "500000" },
                    ],
                    spender: SETTLER,
                },
            }),
            SIGNER,
        );

        expect(result).toHaveLength(2);
        expect(result).toContainEqual(
            expect.objectContaining({ tokenAddress: TOKEN_A, required: "1000000" }),
        );
        expect(result).toContainEqual(
            expect.objectContaining({ tokenAddress: TOKEN_B, required: "500000" }),
        );
        expect(result.every((a) => a.spender === PERMIT2)).toBe(true);
    });

    it("deduplicates by token summing amounts", () => {
        const result = extractPermit2Allowances(
            basePayload({
                message: {
                    permitted: [
                        { token: TOKEN_A, amount: "1000000" },
                        { token: TOKEN_A, amount: "500000" },
                    ],
                    spender: SETTLER,
                },
            }),
            SIGNER,
        );

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({ tokenAddress: TOKEN_A, required: "1500000" });
    });

    it.each(["PermitTransferFrom", "PermitWitnessTransferFrom"] as const)(
        "handles single-entry primaryType %s",
        (primaryType) => {
            const result = extractPermit2Allowances(
                basePayload({
                    primaryType,
                    message: {
                        permitted: { token: TOKEN_A, amount: "777" },
                        spender: SETTLER,
                    },
                }),
                SIGNER,
            );

            expect(result).toEqual([
                {
                    chainId: 1,
                    tokenAddress: TOKEN_A,
                    owner: SIGNER,
                    spender: PERMIT2,
                    required: "777",
                    preferInfinite: true,
                },
            ]);
        },
    );

    it("handles PermitBatchTransferFrom", () => {
        const result = extractPermit2Allowances(
            basePayload({
                primaryType: "PermitBatchTransferFrom",
                message: {
                    permitted: [
                        { token: TOKEN_A, amount: "1" },
                        { token: TOKEN_B, amount: "2" },
                    ],
                    spender: SETTLER,
                },
            }),
            SIGNER,
        );

        expect(result).toHaveLength(2);
    });

    it("returns [] and logs warning for unknown primaryType", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

        const result = extractPermit2Allowances(
            basePayload({ primaryType: "NotPermit2Type" }),
            SIGNER,
        );

        expect(result).toEqual([]);
        expect(warn).toHaveBeenCalledWith(
            expect.stringContaining("Unknown primaryType: NotPermit2Type"),
        );
    });

    it("coerces domain.chainId when sent as string", () => {
        const result = extractPermit2Allowances(
            {
                ...basePayload(),
                domain: { chainId: "137", verifyingContract: PERMIT2 },
            },
            SIGNER,
        );

        expect(result[0]!.chainId).toBe(137);
    });

    it("returns [] when permitted array is empty", () => {
        const result = extractPermit2Allowances(
            basePayload({ message: { permitted: [], spender: SETTLER } }),
            SIGNER,
        );

        expect(result).toEqual([]);
    });

    it("normalizes token address via getAddress (checksum)", () => {
        const lowercased = TOKEN_A.toLowerCase();
        const result = extractPermit2Allowances(
            basePayload({
                message: { permitted: [{ token: lowercased, amount: "1" }], spender: SETTLER },
            }),
            SIGNER,
        );

        expect(result[0]!.tokenAddress).toBe(TOKEN_A);
    });
});
