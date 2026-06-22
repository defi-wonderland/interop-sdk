import { describe, expect, it } from "vitest";

import type { QuoteRequest } from "../../../../src/core/schemas/quoteRequest.js";
import type { Eip712Envelope } from "../../../../src/core/types/eip712.js";
import { PERMIT2_ADDRESS } from "../../../../src/core/constants/eip712.js";
import { Eip712EnvelopeMismatch } from "../../../../src/core/errors/Eip712EnvelopeMismatch.exception.js";
import { NATIVE_ASSET_ADDRESS } from "../../../../src/core/utils/token.js";
import { validateSuperbridgeSignatureEnvelope } from "../../../../src/protocols/superbridge/validators/signatureEnvelopeValidator.js";

const SPENDER = "0xCCC88a9d1B4ed6b0eABA998850414b24F1C315bE";
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const USER = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const TOKEN = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const RECIPIENT = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb8";
const FAKE_ADDRESS = "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef";
const ORIGIN_CHAIN_ID = 1;
const DESTINATION_CHAIN_ID = 10;
const INPUT_AMOUNT = "1000000";
const FUTURE_DEADLINE = Math.floor(Date.now() / 1000) + 3600;
const PAST_DEADLINE = Math.floor(Date.now() / 1000) - 3600;

function makeParams(overrides?: Partial<QuoteRequest>): QuoteRequest {
    return {
        user: USER,
        input: { chainId: ORIGIN_CHAIN_ID, assetAddress: TOKEN, amount: INPUT_AMOUNT },
        output: { chainId: DESTINATION_CHAIN_ID, assetAddress: TOKEN, recipient: RECIPIENT },
        ...overrides,
    };
}

const eip3009Params = makeParams({
    input: { chainId: ORIGIN_CHAIN_ID, assetAddress: USDC_BASE, amount: INPUT_AMOUNT },
});

const nativeInputParams = makeParams({
    input: { chainId: ORIGIN_CHAIN_ID, assetAddress: NATIVE_ASSET_ADDRESS, amount: INPUT_AMOUNT },
});

function makePermit2Envelope(overrides?: Partial<Eip712Envelope>): Eip712Envelope {
    return {
        domain: { name: "Permit2", chainId: ORIGIN_CHAIN_ID, verifyingContract: PERMIT2_ADDRESS },
        primaryType: "PermitTransferFrom",
        types: {},
        message: {
            permitted: { token: TOKEN, amount: INPUT_AMOUNT },
            spender: SPENDER,
            nonce: "1",
            deadline: FUTURE_DEADLINE,
        },
        ...overrides,
    };
}

function makeEip3009Envelope(overrides?: Partial<Eip712Envelope>): Eip712Envelope {
    return {
        domain: {
            name: "USD Coin",
            version: "2",
            chainId: ORIGIN_CHAIN_ID,
            verifyingContract: USDC_BASE,
        },
        primaryType: "ReceiveWithAuthorization",
        types: {},
        message: {
            from: USER,
            to: SPENDER,
            value: INPUT_AMOUNT,
            validAfter: "0",
            validBefore: FUTURE_DEADLINE,
            nonce: "0x0000000000000000000000000000000000000000000000000000000000000001",
        },
        ...overrides,
    };
}

describe("validateSuperbridgeSignatureEnvelope", () => {
    it("rejects an unsupported primaryType", () => {
        expect(() =>
            validateSuperbridgeSignatureEnvelope(
                makePermit2Envelope({ primaryType: "Order" }),
                makeParams(),
            ),
        ).toThrow(/primaryType/);
    });

    describe("Permit2", () => {
        it("accepts a valid envelope", () => {
            expect(() =>
                validateSuperbridgeSignatureEnvelope(makePermit2Envelope(), makeParams()),
            ).not.toThrow();
        });

        it("rejects a tampered chainId", () => {
            expect(() =>
                validateSuperbridgeSignatureEnvelope(
                    makePermit2Envelope({
                        domain: {
                            name: "Permit2",
                            chainId: 999,
                            verifyingContract: PERMIT2_ADDRESS,
                        },
                    }),
                    makeParams(),
                ),
            ).toThrow(/chainId/);
        });

        it("rejects a non-Permit2 verifyingContract", () => {
            expect(() =>
                validateSuperbridgeSignatureEnvelope(
                    makePermit2Envelope({
                        domain: {
                            name: "Permit2",
                            chainId: ORIGIN_CHAIN_ID,
                            verifyingContract: FAKE_ADDRESS,
                        },
                    }),
                    makeParams(),
                ),
            ).toThrow(/verifyingContract/);
        });

        it("rejects a domain that carries a version", () => {
            expect(() =>
                validateSuperbridgeSignatureEnvelope(
                    makePermit2Envelope({
                        domain: {
                            name: "Permit2",
                            version: "1",
                            chainId: ORIGIN_CHAIN_ID,
                            verifyingContract: PERMIT2_ADDRESS,
                        },
                    }),
                    makeParams(),
                ),
            ).toThrow(/domainVersion/);
        });

        it("rejects a permitted token that differs from the input asset", () => {
            expect(() =>
                validateSuperbridgeSignatureEnvelope(
                    makePermit2Envelope({
                        message: {
                            permitted: { token: FAKE_ADDRESS, amount: INPUT_AMOUNT },
                            spender: SPENDER,
                            nonce: "1",
                            deadline: FUTURE_DEADLINE,
                        },
                    }),
                    makeParams(),
                ),
            ).toThrow(/token/);
        });

        it("rejects an inflated permit amount", () => {
            expect(() =>
                validateSuperbridgeSignatureEnvelope(
                    makePermit2Envelope({
                        message: {
                            permitted: { token: TOKEN, amount: "9999999999" },
                            spender: SPENDER,
                            nonce: "1",
                            deadline: FUTURE_DEADLINE,
                        },
                    }),
                    makeParams(),
                ),
            ).toThrow(/amount/);
        });

        it("rejects an expired deadline", () => {
            expect(() =>
                validateSuperbridgeSignatureEnvelope(
                    makePermit2Envelope({
                        message: {
                            permitted: { token: TOKEN, amount: INPUT_AMOUNT },
                            spender: SPENDER,
                            nonce: "1",
                            deadline: PAST_DEADLINE,
                        },
                    }),
                    makeParams(),
                ),
            ).toThrow(/deadline/);
        });

        it("rejects a spender equal to the user", () => {
            expect(() =>
                validateSuperbridgeSignatureEnvelope(
                    makePermit2Envelope({
                        message: {
                            permitted: { token: TOKEN, amount: INPUT_AMOUNT },
                            spender: USER,
                            nonce: "1",
                            deadline: FUTURE_DEADLINE,
                        },
                    }),
                    makeParams(),
                ),
            ).toThrow(/spender/);
        });

        it("rejects a native input asset", () => {
            expect(() =>
                validateSuperbridgeSignatureEnvelope(makePermit2Envelope(), nativeInputParams),
            ).toThrow(Eip712EnvelopeMismatch);
        });
    });

    describe("EIP-3009", () => {
        it("accepts a valid envelope", () => {
            expect(() =>
                validateSuperbridgeSignatureEnvelope(makeEip3009Envelope(), eip3009Params),
            ).not.toThrow();
        });

        it("rejects a verifyingContract that is not the input token", () => {
            expect(() =>
                validateSuperbridgeSignatureEnvelope(
                    makeEip3009Envelope({
                        domain: {
                            name: "USD Coin",
                            version: "2",
                            chainId: ORIGIN_CHAIN_ID,
                            verifyingContract: FAKE_ADDRESS,
                        },
                    }),
                    eip3009Params,
                ),
            ).toThrow(/verifyingContract/);
        });

        it("rejects a domain without a version", () => {
            expect(() =>
                validateSuperbridgeSignatureEnvelope(
                    makeEip3009Envelope({
                        domain: {
                            name: "USD Coin",
                            chainId: ORIGIN_CHAIN_ID,
                            verifyingContract: USDC_BASE,
                        },
                    }),
                    eip3009Params,
                ),
            ).toThrow(/domainVersion/);
        });

        it("rejects a from that is not the user", () => {
            expect(() =>
                validateSuperbridgeSignatureEnvelope(
                    makeEip3009Envelope({
                        message: {
                            from: FAKE_ADDRESS,
                            to: SPENDER,
                            value: INPUT_AMOUNT,
                            validAfter: "0",
                            validBefore: FUTURE_DEADLINE,
                            nonce: "0x01",
                        },
                    }),
                    eip3009Params,
                ),
            ).toThrow(/user/);
        });

        it("rejects an inflated value", () => {
            expect(() =>
                validateSuperbridgeSignatureEnvelope(
                    makeEip3009Envelope({
                        message: {
                            from: USER,
                            to: SPENDER,
                            value: "9999999999",
                            validAfter: "0",
                            validBefore: FUTURE_DEADLINE,
                            nonce: "0x01",
                        },
                    }),
                    eip3009Params,
                ),
            ).toThrow(/amount/);
        });

        it("rejects an expired validBefore", () => {
            expect(() =>
                validateSuperbridgeSignatureEnvelope(
                    makeEip3009Envelope({
                        message: {
                            from: USER,
                            to: SPENDER,
                            value: INPUT_AMOUNT,
                            validAfter: "0",
                            validBefore: PAST_DEADLINE,
                            nonce: "0x01",
                        },
                    }),
                    eip3009Params,
                ),
            ).toThrow(/deadline/);
        });

        it("rejects a recipient equal to the user", () => {
            expect(() =>
                validateSuperbridgeSignatureEnvelope(
                    makeEip3009Envelope({
                        message: {
                            from: USER,
                            to: USER,
                            value: INPUT_AMOUNT,
                            validAfter: "0",
                            validBefore: FUTURE_DEADLINE,
                            nonce: "0x01",
                        },
                    }),
                    eip3009Params,
                ),
            ).toThrow(/to/);
        });

        it("rejects a native input asset", () => {
            expect(() =>
                validateSuperbridgeSignatureEnvelope(makeEip3009Envelope(), nativeInputParams),
            ).toThrow(Eip712EnvelopeMismatch);
        });
    });
});
