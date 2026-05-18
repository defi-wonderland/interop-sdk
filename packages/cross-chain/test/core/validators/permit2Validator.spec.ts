import type { Address } from "viem";
import { describe, expect, it } from "vitest";

import type { SignatureStep } from "../../../src/core/schemas/order.js";
import type { QuoteRequest } from "../../../src/core/schemas/quoteRequest.js";
import { CANONICAL_PERMIT2_ADDRESS } from "../../../src/core/constants/permit2.js";
import { Permit2ValidationFailure } from "../../../src/core/errors/Permit2ValidationFailure.exception.js";
import {
    Permit2SignatureValidator,
    permit2SignatureValidator,
} from "../../../src/core/validators/permit2Validator.js";

const PROVIDER_ID = "test-provider";
const USER = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as Address;
const TOKEN_USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const TOKEN_USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const SETTLER = "0x2778258002a69a0cB1DfD29b360a0bB1654C8652";
const ATTACKER = "0x000000000000000000000000000000000000bEEF";

function makeRequest(overrides?: Partial<QuoteRequest>): QuoteRequest {
    return {
        user: USER,
        input: { chainId: 1, assetAddress: TOKEN_USDC, amount: "10000000" },
        output: { chainId: 8453, assetAddress: TOKEN_USDC, recipient: USER },
        ...overrides,
    };
}

function makePermit2Step(overrides?: {
    primaryType?: string;
    verifyingContract?: string;
    spender?: string;
    permitted?: unknown;
}): SignatureStep {
    return {
        kind: "signature",
        chainId: 1,
        signaturePayload: {
            signatureType: "eip712",
            primaryType: overrides?.primaryType ?? "PermitWitnessTransferFrom",
            domain: {
                name: "Permit2",
                chainId: 1,
                verifyingContract: overrides?.verifyingContract ?? CANONICAL_PERMIT2_ADDRESS,
            },
            types: {
                PermitWitnessTransferFrom: [
                    { name: "permitted", type: "TokenPermissions" },
                    { name: "spender", type: "address" },
                    { name: "nonce", type: "uint256" },
                    { name: "deadline", type: "uint256" },
                ],
            },
            message: {
                permitted: overrides?.permitted ?? { token: TOKEN_USDC, amount: "10000000" },
                spender: overrides?.spender ?? SETTLER,
                nonce: "1",
                deadline: "1779129331",
            },
        },
    };
}

describe("Permit2SignatureValidator", () => {
    describe("verifyingContract guard", () => {
        it("rejects when primaryType is Permit2 but verifyingContract is not canonical", () => {
            const step = makePermit2Step({ verifyingContract: ATTACKER });

            expect(() =>
                permit2SignatureValidator.validate(step, {
                    providerId: PROVIDER_ID,
                    request: makeRequest(),
                }),
            ).toThrow(Permit2ValidationFailure);
            try {
                permit2SignatureValidator.validate(step, {
                    providerId: PROVIDER_ID,
                    request: makeRequest(),
                });
            } catch (err) {
                expect((err as Permit2ValidationFailure).reason).toBe("verifying-contract");
            }
        });

        it("rejects when verifyingContract is canonical Permit2 but primaryType is unknown", () => {
            const step = makePermit2Step({ primaryType: "ReceiveWithAuthorization" });

            try {
                permit2SignatureValidator.validate(step, {
                    providerId: PROVIDER_ID,
                    request: makeRequest(),
                });
                expect.fail("expected throw");
            } catch (err) {
                expect(err).toBeInstanceOf(Permit2ValidationFailure);
                expect((err as Permit2ValidationFailure).reason).toBe("non-permit2-canonical");
            }
        });

        it("accepts an EIP-712 signature that is not Permit2 and not against the canonical address", () => {
            const step = makePermit2Step({
                primaryType: "ReceiveWithAuthorization",
                verifyingContract: TOKEN_USDC,
            });

            expect(() =>
                permit2SignatureValidator.validate(step, {
                    providerId: PROVIDER_ID,
                    request: makeRequest(),
                }),
            ).not.toThrow();
        });
    });

    describe("permitted guard", () => {
        it("rejects when permitted contains a token different from the request input", () => {
            const step = makePermit2Step({
                permitted: { token: TOKEN_USDT, amount: "10000000" },
            });

            try {
                permit2SignatureValidator.validate(step, {
                    providerId: PROVIDER_ID,
                    request: makeRequest(),
                });
                expect.fail("expected throw");
            } catch (err) {
                expect((err as Permit2ValidationFailure).reason).toBe("permitted-token");
            }
        });

        it("rejects when permitted total amount exceeds the request input amount", () => {
            const step = makePermit2Step({
                permitted: { token: TOKEN_USDC, amount: "99999999999" },
            });

            try {
                permit2SignatureValidator.validate(step, {
                    providerId: PROVIDER_ID,
                    request: makeRequest(),
                });
                expect.fail("expected throw");
            } catch (err) {
                expect((err as Permit2ValidationFailure).reason).toBe("permitted-amount");
            }
        });

        it("accepts a batch permit summing matching tokens within the requested amount", () => {
            const step = makePermit2Step({
                primaryType: "PermitBatchWitnessTransferFrom",
                permitted: [
                    { token: TOKEN_USDC, amount: "6000000" },
                    { token: TOKEN_USDC, amount: "4000000" },
                ],
            });

            expect(() =>
                permit2SignatureValidator.validate(step, {
                    providerId: PROVIDER_ID,
                    request: makeRequest(),
                }),
            ).not.toThrow();
        });

        it("rejects when permitted is an empty array on a batch Permit2 type", () => {
            const step = makePermit2Step({
                primaryType: "PermitBatchWitnessTransferFrom",
                permitted: [],
            });

            try {
                permit2SignatureValidator.validate(step, {
                    providerId: PROVIDER_ID,
                    request: makeRequest(),
                });
                expect.fail("expected throw");
            } catch (err) {
                expect((err as Permit2ValidationFailure).reason).toBe("permitted-empty");
            }
        });

        it("rejects when permitted is malformed (string instead of array/object)", () => {
            const step = makePermit2Step({
                primaryType: "PermitBatchWitnessTransferFrom",
                permitted: "not-an-array",
            });

            try {
                permit2SignatureValidator.validate(step, {
                    providerId: PROVIDER_ID,
                    request: makeRequest(),
                });
                expect.fail("expected throw");
            } catch (err) {
                expect((err as Permit2ValidationFailure).reason).toBe("permitted-empty");
            }
        });

        it("rejects a batch permit when one token does not match the request input", () => {
            const step = makePermit2Step({
                primaryType: "PermitBatchWitnessTransferFrom",
                permitted: [
                    { token: TOKEN_USDC, amount: "6000000" },
                    { token: TOKEN_USDT, amount: "4000000" },
                ],
            });

            try {
                permit2SignatureValidator.validate(step, {
                    providerId: PROVIDER_ID,
                    request: makeRequest(),
                });
                expect.fail("expected throw");
            } catch (err) {
                expect((err as Permit2ValidationFailure).reason).toBe("permitted-token");
            }
        });
    });

    describe("spender guard", () => {
        it("rejects when spender is not in the expected list", () => {
            const step = makePermit2Step({ spender: ATTACKER });

            try {
                permit2SignatureValidator.validate(step, {
                    providerId: PROVIDER_ID,
                    request: makeRequest(),
                    expectedSpenders: [SETTLER as Address],
                });
                expect.fail("expected throw");
            } catch (err) {
                expect((err as Permit2ValidationFailure).reason).toBe("spender");
            }
        });

        it("accepts when spender matches one of the expected addresses (case-insensitive)", () => {
            const step = makePermit2Step({ spender: SETTLER.toLowerCase() });

            expect(() =>
                permit2SignatureValidator.validate(step, {
                    providerId: PROVIDER_ID,
                    request: makeRequest(),
                    expectedSpenders: [SETTLER as Address],
                }),
            ).not.toThrow();
        });

        it("skips spender check when expectedSpenders is not provided", () => {
            const step = makePermit2Step({ spender: ATTACKER });

            expect(() =>
                permit2SignatureValidator.validate(step, {
                    providerId: PROVIDER_ID,
                    request: makeRequest(),
                }),
            ).not.toThrow();
        });
    });

    describe("happy path", () => {
        it("accepts a canonical single Permit2 transfer", () => {
            const step = makePermit2Step();

            expect(() =>
                permit2SignatureValidator.validate(step, {
                    providerId: PROVIDER_ID,
                    request: makeRequest(),
                    expectedSpenders: [SETTLER as Address],
                }),
            ).not.toThrow();
        });
    });

    it("exposes a singleton instance", () => {
        expect(permit2SignatureValidator).toBeInstanceOf(Permit2SignatureValidator);
    });
});
