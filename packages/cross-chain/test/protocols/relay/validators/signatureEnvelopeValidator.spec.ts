import { describe, expect, it } from "vitest";

import type { QuoteRequest } from "../../../../src/core/schemas/quoteRequest.js";
import type { Eip712Envelope } from "../../../../src/core/types/eip712.js";
import { PERMIT2_ADDRESS } from "../../../../src/core/constants/eip712.js";
import { Eip712EnvelopeMismatch } from "../../../../src/core/errors/Eip712EnvelopeMismatch.exception.js";
import { NATIVE_ASSET_ADDRESS } from "../../../../src/core/utils/token.js";
import { validateRelaySignatureEnvelope } from "../../../../src/protocols/relay/validators/signatureEnvelopeValidator.js";

const RELAY_SOLVER = "0xCCC88a9d1B4ed6b0eABA998850414b24F1C315bE";
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
    input: {
        chainId: ORIGIN_CHAIN_ID,
        assetAddress: NATIVE_ASSET_ADDRESS,
        amount: INPUT_AMOUNT,
    },
});

function makePermit2Envelope(overrides?: Partial<Eip712Envelope>): Eip712Envelope {
    return {
        domain: { name: "Permit2", chainId: ORIGIN_CHAIN_ID, verifyingContract: PERMIT2_ADDRESS },
        primaryType: "PermitTransferFrom",
        types: {},
        message: {
            permitted: { token: TOKEN, amount: INPUT_AMOUNT },
            spender: RELAY_SOLVER,
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
            to: RELAY_SOLVER,
            value: INPUT_AMOUNT,
            validAfter: 0,
            validBefore: FUTURE_DEADLINE,
            nonce: "0xabcd",
        },
        ...overrides,
    };
}

describe("validateRelaySignatureEnvelope", () => {
    describe("Permit2", () => {
        it("accepts a valid envelope", () => {
            expect(() =>
                validateRelaySignatureEnvelope(makePermit2Envelope(), makeParams()),
            ).not.toThrow();
        });

        it.each([
            { name: "primaryType outside Relay allow-list", primaryType: "FooBar" },
            { name: "AllowanceTransfer.Permit", primaryType: "Permit" },
            { name: "AllowanceTransfer.PermitBatch", primaryType: "PermitBatch" },
        ])("rejects $name", ({ primaryType }) => {
            expect(() =>
                validateRelaySignatureEnvelope(makePermit2Envelope({ primaryType }), makeParams()),
            ).toThrowError(/primaryType/);
        });

        it.each([
            {
                name: "tampered chainId",
                domain: { chainId: 137, verifyingContract: PERMIT2_ADDRESS },
                expected: /chainId/,
            },
            {
                name: "non-canonical verifyingContract",
                domain: { chainId: ORIGIN_CHAIN_ID, verifyingContract: FAKE_ADDRESS },
                expected: /verifyingContract/,
            },
            {
                name: "domain carrying `version`",
                domain: {
                    chainId: ORIGIN_CHAIN_ID,
                    verifyingContract: PERMIT2_ADDRESS,
                    version: "1",
                },
                expected: /domainVersion/,
            },
        ])("rejects $name", ({ domain, expected }) => {
            expect(() =>
                validateRelaySignatureEnvelope(makePermit2Envelope({ domain }), makeParams()),
            ).toThrowError(expected);
        });

        it.each([
            {
                name: "tampered token in `permitted`",
                message: {
                    permitted: { token: FAKE_ADDRESS, amount: INPUT_AMOUNT },
                    spender: RELAY_SOLVER,
                    nonce: "1",
                    deadline: FUTURE_DEADLINE,
                },
                expected: /token/,
            },
            {
                name: "inflated amount in `permitted`",
                message: {
                    permitted: { token: TOKEN, amount: "99999999999" },
                    spender: RELAY_SOLVER,
                    nonce: "1",
                    deadline: FUTURE_DEADLINE,
                },
                expected: /amount/,
            },
            {
                name: "expired deadline",
                message: {
                    permitted: { token: TOKEN, amount: INPUT_AMOUNT },
                    spender: RELAY_SOLVER,
                    nonce: "1",
                    deadline: PAST_DEADLINE,
                },
                expected: /deadline/,
            },
            {
                name: "spender equals the user",
                message: {
                    permitted: { token: TOKEN, amount: INPUT_AMOUNT },
                    spender: USER,
                    nonce: "1",
                    deadline: FUTURE_DEADLINE,
                },
                expected: /spender/,
            },
            {
                name: "spender field missing",
                message: {
                    permitted: { token: TOKEN, amount: INPUT_AMOUNT },
                    nonce: "1",
                    deadline: FUTURE_DEADLINE,
                },
                expected: /spender/,
            },
            {
                name: "spender is not a string address",
                message: {
                    permitted: { token: TOKEN, amount: INPUT_AMOUNT },
                    spender: 42,
                    nonce: "1",
                    deadline: FUTURE_DEADLINE,
                },
                expected: /spender/,
            },
        ])("rejects $name", ({ message, expected }) => {
            expect(() =>
                validateRelaySignatureEnvelope(makePermit2Envelope({ message }), makeParams()),
            ).toThrowError(expected);
        });

        it("rejects when input is the native asset placeholder", () => {
            expect(() =>
                validateRelaySignatureEnvelope(makePermit2Envelope(), nativeInputParams),
            ).toThrow(Eip712EnvelopeMismatch);
        });
    });

    describe("EIP-3009", () => {
        it.each([
            { primaryType: "ReceiveWithAuthorization" },
            { primaryType: "TransferWithAuthorization" },
        ])("accepts a valid $primaryType envelope", ({ primaryType }) => {
            expect(() =>
                validateRelaySignatureEnvelope(makeEip3009Envelope({ primaryType }), eip3009Params),
            ).not.toThrow();
        });

        it.each([
            {
                name: "verifyingContract is not the input token",
                domain: {
                    name: "USD Coin",
                    version: "2",
                    chainId: ORIGIN_CHAIN_ID,
                    verifyingContract: FAKE_ADDRESS,
                },
                expected: /verifyingContract/,
            },
            {
                name: "domain missing `version`",
                domain: {
                    name: "USD Coin",
                    chainId: ORIGIN_CHAIN_ID,
                    verifyingContract: USDC_BASE,
                },
                expected: /domainVersion/,
            },
            {
                name: "domain `version` is empty",
                domain: {
                    name: "USD Coin",
                    version: "",
                    chainId: ORIGIN_CHAIN_ID,
                    verifyingContract: USDC_BASE,
                },
                expected: /domainVersion/,
            },
        ])("rejects $name", ({ domain, expected }) => {
            expect(() =>
                validateRelaySignatureEnvelope(makeEip3009Envelope({ domain }), eip3009Params),
            ).toThrowError(expected);
        });

        it.each([
            {
                name: "`from` differs from the user",
                message: {
                    from: FAKE_ADDRESS,
                    to: RELAY_SOLVER,
                    value: INPUT_AMOUNT,
                    validAfter: 0,
                    validBefore: FUTURE_DEADLINE,
                    nonce: "0xabcd",
                },
                expected: /user/,
            },
            {
                name: "inflated `value`",
                message: {
                    from: USER,
                    to: RELAY_SOLVER,
                    value: "999999999999",
                    validAfter: 0,
                    validBefore: FUTURE_DEADLINE,
                    nonce: "0xabcd",
                },
                expected: /amount/,
            },
            {
                name: "expired `validBefore`",
                message: {
                    from: USER,
                    to: RELAY_SOLVER,
                    value: INPUT_AMOUNT,
                    validAfter: 0,
                    validBefore: PAST_DEADLINE,
                    nonce: "0xabcd",
                },
                expected: /deadline/,
            },
            {
                name: "`to` equals the user",
                message: {
                    from: USER,
                    to: USER,
                    value: INPUT_AMOUNT,
                    validAfter: 0,
                    validBefore: FUTURE_DEADLINE,
                    nonce: "0xabcd",
                },
                expected: /to/,
            },
            {
                name: "`to` field missing",
                message: {
                    from: USER,
                    value: INPUT_AMOUNT,
                    validAfter: 0,
                    validBefore: FUTURE_DEADLINE,
                    nonce: "0xabcd",
                },
                expected: /to/,
            },
        ])("rejects $name", ({ message, expected }) => {
            expect(() =>
                validateRelaySignatureEnvelope(makeEip3009Envelope({ message }), eip3009Params),
            ).toThrowError(expected);
        });

        it("rejects when input is the native asset placeholder", () => {
            expect(() =>
                validateRelaySignatureEnvelope(makeEip3009Envelope(), nativeInputParams),
            ).toThrow(Eip712EnvelopeMismatch);
        });
    });
});
