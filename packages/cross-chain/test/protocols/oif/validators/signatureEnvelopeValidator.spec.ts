import type { Oif3009Order, OifEscrowOrder } from "@openintentsframework/oif-specs";
import type { Hex } from "viem";
import { pad } from "viem";
import { describe, expect, it } from "vitest";

import type { QuoteRequest } from "../../../../src/core/schemas/quoteRequest.js";
import { PERMIT2_ADDRESS } from "../../../../src/core/constants/eip712.js";
import { NATIVE_ASSET_ADDRESS } from "../../../../src/core/utils/token.js";
import { OIF_INPUT_SETTLER_ESCROW_BY_CHAIN } from "../../../../src/protocols/oif/constants.js";
import {
    validateOif3009SignatureEnvelope,
    validateOifEscrowSignatureEnvelope,
} from "../../../../src/protocols/oif/validators/signatureEnvelopeValidator.js";

const TOKEN = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const OUTPUT_TOKEN = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const USER = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const RECIPIENT = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb8";
const INPUT_CHAIN = 42161;
const SETTLER = OIF_INPUT_SETTLER_ESCROW_BY_CHAIN[INPUT_CHAIN]!;
const OUTPUT_SETTLER = "0x52602D7cc3D833F5d28ee6D01C7F82C9b2322e10";
const ATTACKER = "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef";
const OUTPUT_CHAIN = 10;
const INPUT_AMOUNT = "1000000";
const OUTPUT_AMOUNT = "990000";
const FUTURE = Math.floor(Date.now() / 1000) + 3600;
const PAST = Math.floor(Date.now() / 1000) - 3600;

const bytes32 = (addr: string): Hex => pad(addr as Hex, { size: 32 });

const params = (overrides: Partial<QuoteRequest> = {}): QuoteRequest => ({
    user: USER,
    input: { chainId: INPUT_CHAIN, assetAddress: TOKEN, amount: INPUT_AMOUNT },
    output: {
        chainId: OUTPUT_CHAIN,
        assetAddress: OUTPUT_TOKEN,
        amount: OUTPUT_AMOUNT,
        recipient: RECIPIENT,
    },
    ...overrides,
});

const witness = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    user: USER,
    expires: FUTURE,
    inputOracle: OUTPUT_SETTLER,
    outputs: [
        {
            oracle: bytes32(OUTPUT_SETTLER),
            settler: bytes32(OUTPUT_SETTLER),
            chainId: OUTPUT_CHAIN,
            token: bytes32(OUTPUT_TOKEN),
            amount: OUTPUT_AMOUNT,
            recipient: bytes32(RECIPIENT),
            callbackData: "0x",
            context: "0x",
            ...overrides,
        },
    ],
});

const escrowOrder = (
    overrides: {
        domain?: Record<string, unknown>;
        message?: Record<string, unknown>;
        primaryType?: string;
    } = {},
): OifEscrowOrder => ({
    type: "oif-escrow-v0",
    payload: {
        signatureType: "eip712",
        domain: overrides.domain ?? {
            name: "Permit2",
            chainId: INPUT_CHAIN,
            verifyingContract: PERMIT2_ADDRESS,
        },
        primaryType: overrides.primaryType ?? "PermitBatchWitnessTransferFrom",
        types: {},
        message: overrides.message ?? {
            permitted: [{ token: TOKEN, amount: INPUT_AMOUNT }],
            spender: SETTLER,
            nonce: "1",
            deadline: FUTURE,
            witness: witness(),
        },
    },
});

const escrowMessage = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    permitted: [{ token: TOKEN, amount: INPUT_AMOUNT }],
    spender: SETTLER,
    nonce: "1",
    deadline: FUTURE,
    witness: witness(),
    ...overrides,
});

const eip3009Order = (
    overrides: {
        domain?: Record<string, unknown>;
        message?: Record<string, unknown>;
        primaryType?: string;
    } = {},
): Oif3009Order => ({
    type: "oif-3009-v0",
    payload: {
        signatureType: "eip712",
        domain: overrides.domain ?? {
            name: "USD Coin",
            version: "2",
            chainId: INPUT_CHAIN,
            verifyingContract: TOKEN,
        },
        primaryType: overrides.primaryType ?? "ReceiveWithAuthorization",
        types: {},
        message: overrides.message ?? {
            from: USER,
            to: SETTLER,
            value: INPUT_AMOUNT,
            validAfter: 0,
            validBefore: FUTURE,
            nonce: "0xabcd",
        },
    },
    metadata: {},
});

describe("validateOifEscrowSignatureEnvelope", () => {
    it("accepts a valid envelope", () => {
        expect(() => validateOifEscrowSignatureEnvelope(escrowOrder(), params())).not.toThrow();
    });

    it("rejects a wrong primaryType", () => {
        expect(() =>
            validateOifEscrowSignatureEnvelope(
                escrowOrder({ primaryType: "PermitTransferFrom" }),
                params(),
            ),
        ).toThrowError(/primaryType/);
    });

    it("rejects a non-canonical Permit2 verifyingContract", () => {
        expect(() =>
            validateOifEscrowSignatureEnvelope(
                escrowOrder({ domain: { chainId: INPUT_CHAIN, verifyingContract: ATTACKER } }),
                params(),
            ),
        ).toThrowError(/verifyingContract/);
    });

    it("rejects a Permit2 domain that carries a version", () => {
        expect(() =>
            validateOifEscrowSignatureEnvelope(
                escrowOrder({
                    domain: {
                        chainId: INPUT_CHAIN,
                        verifyingContract: PERMIT2_ADDRESS,
                        version: "1",
                    },
                }),
                params(),
            ),
        ).toThrowError(/domainVersion/);
    });

    it("rejects a chainId mismatch", () => {
        expect(() =>
            validateOifEscrowSignatureEnvelope(
                escrowOrder({
                    domain: { chainId: 137, verifyingContract: PERMIT2_ADDRESS },
                }),
                params(),
            ),
        ).toThrowError(/chainId/);
    });

    it("rejects an expired deadline", () => {
        expect(() =>
            validateOifEscrowSignatureEnvelope(
                escrowOrder({ message: escrowMessage({ deadline: PAST }) }),
                params(),
            ),
        ).toThrowError(/deadline/);
    });

    it("rejects a permitted token that differs from params.input.assetAddress", () => {
        expect(() =>
            validateOifEscrowSignatureEnvelope(
                escrowOrder({
                    message: escrowMessage({
                        permitted: [{ token: OUTPUT_TOKEN, amount: INPUT_AMOUNT }],
                    }),
                }),
                params(),
            ),
        ).toThrowError(/token/);
    });

    it("rejects an amount inflated beyond params.input.amount", () => {
        expect(() =>
            validateOifEscrowSignatureEnvelope(
                escrowOrder({
                    message: escrowMessage({
                        permitted: [{ token: TOKEN, amount: "9999999999" }],
                    }),
                }),
                params(),
            ),
        ).toThrowError(/amount/);
    });

    it("rejects a spender that equals the user", () => {
        expect(() =>
            validateOifEscrowSignatureEnvelope(
                escrowOrder({ message: escrowMessage({ spender: USER }) }),
                params(),
            ),
        ).toThrowError(/spender/);
    });

    it("rejects when the user requested a native input asset", () => {
        expect(() =>
            validateOifEscrowSignatureEnvelope(
                escrowOrder(),
                params({
                    input: {
                        chainId: INPUT_CHAIN,
                        assetAddress: NATIVE_ASSET_ADDRESS,
                        amount: INPUT_AMOUNT,
                    },
                }),
            ),
        ).toThrowError(/native/);
    });

    describe("witness", () => {
        it("rejects a missing witness", () => {
            const message = escrowMessage();
            delete (message as Record<string, unknown>).witness;
            expect(() =>
                validateOifEscrowSignatureEnvelope(escrowOrder({ message }), params()),
            ).toThrowError(/missing witness/);
        });

        it("rejects when witness.user differs from params.user", () => {
            expect(() =>
                validateOifEscrowSignatureEnvelope(
                    escrowOrder({
                        message: escrowMessage({ witness: { ...witness(), user: ATTACKER } }),
                    }),
                    params(),
                ),
            ).toThrowError(/user/);
        });

        it.each([
            ["empty", []],
            ["multiple", [witness().outputs[0], witness().outputs[0]]],
        ])("rejects when witness.outputs is %s", (_label, outputs) => {
            expect(() =>
                validateOifEscrowSignatureEnvelope(
                    escrowOrder({ message: escrowMessage({ witness: { ...witness(), outputs } }) }),
                    params(),
                ),
            ).toThrowError(/exactly one entry/);
        });

        it.each([
            ["chainId", { chainId: 999 }, /chainId/],
            ["token", { token: bytes32(ATTACKER) }, /token/],
            ["recipient", { recipient: bytes32(ATTACKER) }, /recipient/],
            // Solver under-delivers: signs a near-zero output but pulls the
            // full input via Permit2. Must be rejected.
            ["under-delivered amount", { amount: "1" }, /amount/],
        ])("rejects a tampered outputs[0].%s", (_label, override, matcher) => {
            expect(() =>
                validateOifEscrowSignatureEnvelope(
                    escrowOrder({ message: escrowMessage({ witness: witness(override) }) }),
                    params(),
                ),
            ).toThrowError(matcher);
        });

        it("falls back to params.user as recipient when params.output.recipient is omitted", () => {
            expect(() =>
                validateOifEscrowSignatureEnvelope(
                    escrowOrder({
                        message: escrowMessage({ witness: witness({ recipient: bytes32(USER) }) }),
                    }),
                    params({
                        output: {
                            chainId: OUTPUT_CHAIN,
                            assetAddress: OUTPUT_TOKEN,
                            amount: OUTPUT_AMOUNT,
                        },
                    }),
                ),
            ).not.toThrow();
        });
    });
});

describe("validateOif3009SignatureEnvelope", () => {
    it("accepts a valid envelope", () => {
        expect(() => validateOif3009SignatureEnvelope(eip3009Order(), params())).not.toThrow();
    });

    it("rejects a primaryType outside the EIP-3009 allow-list", () => {
        expect(() =>
            validateOif3009SignatureEnvelope(eip3009Order({ primaryType: "Permit" }), params()),
        ).toThrowError(/primaryType/);
    });

    it("rejects a missing domain.version", () => {
        expect(() =>
            validateOif3009SignatureEnvelope(
                eip3009Order({ domain: { chainId: INPUT_CHAIN, verifyingContract: TOKEN } }),
                params(),
            ),
        ).toThrowError(/domainVersion/);
    });

    it("rejects a chainId mismatch", () => {
        expect(() =>
            validateOif3009SignatureEnvelope(
                eip3009Order({ domain: { version: "2", chainId: 137, verifyingContract: TOKEN } }),
                params(),
            ),
        ).toThrowError(/chainId/);
    });

    it("rejects a verifyingContract that differs from params.input.assetAddress", () => {
        expect(() =>
            validateOif3009SignatureEnvelope(
                eip3009Order({
                    domain: { version: "2", chainId: INPUT_CHAIN, verifyingContract: ATTACKER },
                }),
                params(),
            ),
        ).toThrowError(/verifyingContract/);
    });

    it("rejects a message.from that differs from params.user", () => {
        expect(() =>
            validateOif3009SignatureEnvelope(
                eip3009Order({
                    message: {
                        from: ATTACKER,
                        to: SETTLER,
                        value: INPUT_AMOUNT,
                        validAfter: 0,
                        validBefore: FUTURE,
                        nonce: "0xabcd",
                    },
                }),
                params(),
            ),
        ).toThrowError(/user/);
    });

    it("rejects a `to` field that does not match the input settler", () => {
        expect(() =>
            validateOif3009SignatureEnvelope(
                eip3009Order({
                    message: {
                        from: USER,
                        to: ATTACKER,
                        value: INPUT_AMOUNT,
                        validAfter: 0,
                        validBefore: FUTURE,
                        nonce: "0xabcd",
                    },
                }),
                params(),
            ),
        ).toThrowError(/to/);
    });

    it("rejects a message.value that exceeds params.input.amount", () => {
        expect(() =>
            validateOif3009SignatureEnvelope(
                eip3009Order({
                    message: {
                        from: USER,
                        to: SETTLER,
                        value: "999999999999",
                        validAfter: 0,
                        validBefore: FUTURE,
                        nonce: "0xabcd",
                    },
                }),
                params(),
            ),
        ).toThrowError(/amount/);
    });

    it("rejects when the user requested a native input asset", () => {
        expect(() =>
            validateOif3009SignatureEnvelope(
                eip3009Order(),
                params({
                    input: {
                        chainId: INPUT_CHAIN,
                        assetAddress: NATIVE_ASSET_ADDRESS,
                        amount: INPUT_AMOUNT,
                    },
                }),
            ),
        ).toThrowError(/native/);
    });
});
