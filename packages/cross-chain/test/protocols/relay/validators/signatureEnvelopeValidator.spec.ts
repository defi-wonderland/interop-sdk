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
const ORIGIN_CHAIN_ID = 1;
const DESTINATION_CHAIN_ID = 10;
const INPUT_AMOUNT = "1000000";
const FUTURE_DEADLINE = Math.floor(Date.now() / 1000) + 3600;

function makeParams(overrides?: Partial<QuoteRequest>): QuoteRequest {
    return {
        user: USER,
        input: { chainId: ORIGIN_CHAIN_ID, assetAddress: TOKEN, amount: INPUT_AMOUNT },
        output: { chainId: DESTINATION_CHAIN_ID, assetAddress: TOKEN, recipient: RECIPIENT },
        ...overrides,
    };
}

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
    it("accepts a valid Permit2 envelope", () => {
        expect(() =>
            validateRelaySignatureEnvelope(makePermit2Envelope(), makeParams()),
        ).not.toThrow();
    });

    it("rejects tampered chainId", () => {
        const envelope = makePermit2Envelope({
            domain: { chainId: 137, verifyingContract: PERMIT2_ADDRESS },
        });
        expect(() => validateRelaySignatureEnvelope(envelope, makeParams())).toThrowError(
            /chainId/,
        );
    });

    it("rejects a Permit2 envelope whose verifyingContract is not canonical Permit2", () => {
        const envelope = makePermit2Envelope({
            domain: {
                chainId: ORIGIN_CHAIN_ID,
                verifyingContract: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
            },
        });
        expect(() => validateRelaySignatureEnvelope(envelope, makeParams())).toThrowError(
            /verifyingContract/,
        );
    });

    it("rejects a primaryType outside the Relay allow-list", () => {
        const envelope = makePermit2Envelope({ primaryType: "FooBar" });
        expect(() => validateRelaySignatureEnvelope(envelope, makeParams())).toThrowError(
            /primaryType/,
        );
    });

    it("rejects Permit2 AllowanceTransfer types (Permit / PermitBatch)", () => {
        // AllowanceTransfer envelopes use `details`, not `permitted`; if they slipped
        // past the allow-list, validatePermit2Message would reject them as malformed.
        for (const primaryType of ["Permit", "PermitBatch"]) {
            const envelope = makePermit2Envelope({ primaryType });
            expect(() => validateRelaySignatureEnvelope(envelope, makeParams())).toThrowError(
                /primaryType/,
            );
        }
    });

    it("rejects a tampered token in permitted", () => {
        const envelope = makePermit2Envelope({
            message: {
                permitted: {
                    token: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
                    amount: INPUT_AMOUNT,
                },
                spender: RELAY_SOLVER,
                nonce: "1",
                deadline: FUTURE_DEADLINE,
            },
        });
        expect(() => validateRelaySignatureEnvelope(envelope, makeParams())).toThrowError(/token/);
    });

    it("rejects an inflated amount in permitted", () => {
        const envelope = makePermit2Envelope({
            message: {
                permitted: { token: TOKEN, amount: "99999999999" },
                spender: RELAY_SOLVER,
                nonce: "1",
                deadline: FUTURE_DEADLINE,
            },
        });
        expect(() => validateRelaySignatureEnvelope(envelope, makeParams())).toThrowError(/amount/);
    });

    it("rejects an expired deadline", () => {
        const envelope = makePermit2Envelope({
            message: {
                permitted: { token: TOKEN, amount: INPUT_AMOUNT },
                spender: RELAY_SOLVER,
                nonce: "1",
                deadline: Math.floor(Date.now() / 1000) - 3600,
            },
        });
        expect(() => validateRelaySignatureEnvelope(envelope, makeParams())).toThrowError(
            /deadline/,
        );
    });

    it("rejects a Permit2 envelope whose domain carries `version`", () => {
        const envelope = makePermit2Envelope({
            domain: {
                chainId: ORIGIN_CHAIN_ID,
                verifyingContract: PERMIT2_ADDRESS,
                version: "1",
            },
        });
        expect(() => validateRelaySignatureEnvelope(envelope, makeParams())).toThrowError(
            /domainVersion/,
        );
    });

    it("rejects a Permit2 envelope when the input is the native asset placeholder", () => {
        const params = makeParams({
            input: {
                chainId: ORIGIN_CHAIN_ID,
                assetAddress: NATIVE_ASSET_ADDRESS,
                amount: INPUT_AMOUNT,
            },
        });
        expect(() => validateRelaySignatureEnvelope(makePermit2Envelope(), params)).toThrow(
            Eip712EnvelopeMismatch,
        );
    });

    it("accepts a valid EIP-3009 envelope when the input token signed it", () => {
        const params = makeParams({
            input: { chainId: ORIGIN_CHAIN_ID, assetAddress: USDC_BASE, amount: INPUT_AMOUNT },
        });
        expect(() => validateRelaySignatureEnvelope(makeEip3009Envelope(), params)).not.toThrow();
    });

    it("accepts TransferWithAuthorization as well as ReceiveWithAuthorization", () => {
        const params = makeParams({
            input: { chainId: ORIGIN_CHAIN_ID, assetAddress: USDC_BASE, amount: INPUT_AMOUNT },
        });
        const envelope = makeEip3009Envelope({ primaryType: "TransferWithAuthorization" });
        expect(() => validateRelaySignatureEnvelope(envelope, params)).not.toThrow();
    });

    it("rejects an EIP-3009 envelope signed by a contract other than the input token", () => {
        const params = makeParams({
            input: { chainId: ORIGIN_CHAIN_ID, assetAddress: USDC_BASE, amount: INPUT_AMOUNT },
        });
        const envelope = makeEip3009Envelope({
            domain: {
                name: "USD Coin",
                version: "2",
                chainId: ORIGIN_CHAIN_ID,
                verifyingContract: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
            },
        });
        expect(() => validateRelaySignatureEnvelope(envelope, params)).toThrowError(
            /verifyingContract/,
        );
    });

    it("rejects an EIP-3009 envelope whose `from` differs from the user", () => {
        const params = makeParams({
            input: { chainId: ORIGIN_CHAIN_ID, assetAddress: USDC_BASE, amount: INPUT_AMOUNT },
        });
        const envelope = makeEip3009Envelope({
            message: {
                from: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
                to: RELAY_SOLVER,
                value: INPUT_AMOUNT,
                validAfter: 0,
                validBefore: FUTURE_DEADLINE,
                nonce: "0xabcd",
            },
        });
        expect(() => validateRelaySignatureEnvelope(envelope, params)).toThrowError(/user/);
    });

    it("rejects an EIP-3009 envelope with an inflated value", () => {
        const params = makeParams({
            input: { chainId: ORIGIN_CHAIN_ID, assetAddress: USDC_BASE, amount: INPUT_AMOUNT },
        });
        const envelope = makeEip3009Envelope({
            message: {
                from: USER,
                to: RELAY_SOLVER,
                value: "999999999999",
                validAfter: 0,
                validBefore: FUTURE_DEADLINE,
                nonce: "0xabcd",
            },
        });
        expect(() => validateRelaySignatureEnvelope(envelope, params)).toThrowError(/amount/);
    });

    it("rejects an EIP-3009 envelope with an expired validBefore", () => {
        const params = makeParams({
            input: { chainId: ORIGIN_CHAIN_ID, assetAddress: USDC_BASE, amount: INPUT_AMOUNT },
        });
        const envelope = makeEip3009Envelope({
            message: {
                from: USER,
                to: RELAY_SOLVER,
                value: INPUT_AMOUNT,
                validAfter: 0,
                validBefore: Math.floor(Date.now() / 1000) - 3600,
                nonce: "0xabcd",
            },
        });
        expect(() => validateRelaySignatureEnvelope(envelope, params)).toThrowError(/deadline/);
    });

    it("rejects an EIP-3009 envelope when the input is the native asset", () => {
        const params = makeParams({
            input: {
                chainId: ORIGIN_CHAIN_ID,
                assetAddress: NATIVE_ASSET_ADDRESS,
                amount: INPUT_AMOUNT,
            },
        });
        expect(() => validateRelaySignatureEnvelope(makeEip3009Envelope(), params)).toThrow(
            Eip712EnvelopeMismatch,
        );
    });

    it("rejects an EIP-3009 envelope whose domain is missing version", () => {
        const params = makeParams({
            input: { chainId: ORIGIN_CHAIN_ID, assetAddress: USDC_BASE, amount: INPUT_AMOUNT },
        });
        const envelope = makeEip3009Envelope({
            domain: {
                name: "USD Coin",
                chainId: ORIGIN_CHAIN_ID,
                verifyingContract: USDC_BASE,
            },
        });
        expect(() => validateRelaySignatureEnvelope(envelope, params)).toThrowError(
            /domainVersion/,
        );
    });

    it("rejects an EIP-3009 envelope whose domain has an empty version", () => {
        const params = makeParams({
            input: { chainId: ORIGIN_CHAIN_ID, assetAddress: USDC_BASE, amount: INPUT_AMOUNT },
        });
        const envelope = makeEip3009Envelope({
            domain: {
                name: "USD Coin",
                version: "",
                chainId: ORIGIN_CHAIN_ID,
                verifyingContract: USDC_BASE,
            },
        });
        expect(() => validateRelaySignatureEnvelope(envelope, params)).toThrowError(
            /domainVersion/,
        );
    });

    it("rejects a Permit2 envelope whose spender equals the user", () => {
        const envelope = makePermit2Envelope({
            message: {
                permitted: { token: TOKEN, amount: INPUT_AMOUNT },
                spender: USER,
                nonce: "1",
                deadline: FUTURE_DEADLINE,
            },
        });
        expect(() => validateRelaySignatureEnvelope(envelope, makeParams())).toThrowError(
            /spender/,
        );
    });

    it("rejects a Permit2 envelope whose spender field is missing", () => {
        const envelope = makePermit2Envelope({
            message: {
                permitted: { token: TOKEN, amount: INPUT_AMOUNT },
                nonce: "1",
                deadline: FUTURE_DEADLINE,
            },
        });
        expect(() => validateRelaySignatureEnvelope(envelope, makeParams())).toThrowError(
            /spender/,
        );
    });

    it("rejects a Permit2 envelope whose spender is not a string address", () => {
        const envelope = makePermit2Envelope({
            message: {
                permitted: { token: TOKEN, amount: INPUT_AMOUNT },
                spender: 42,
                nonce: "1",
                deadline: FUTURE_DEADLINE,
            },
        });
        expect(() => validateRelaySignatureEnvelope(envelope, makeParams())).toThrowError(
            /spender/,
        );
    });

    it("rejects an EIP-3009 envelope whose `to` equals the user", () => {
        const params = makeParams({
            input: { chainId: ORIGIN_CHAIN_ID, assetAddress: USDC_BASE, amount: INPUT_AMOUNT },
        });
        const envelope = makeEip3009Envelope({
            message: {
                from: USER,
                to: USER,
                value: INPUT_AMOUNT,
                validAfter: 0,
                validBefore: FUTURE_DEADLINE,
                nonce: "0xabcd",
            },
        });
        expect(() => validateRelaySignatureEnvelope(envelope, params)).toThrowError(/to/);
    });

    it("rejects an EIP-3009 envelope whose `to` field is missing", () => {
        const params = makeParams({
            input: { chainId: ORIGIN_CHAIN_ID, assetAddress: USDC_BASE, amount: INPUT_AMOUNT },
        });
        const envelope = makeEip3009Envelope({
            message: {
                from: USER,
                value: INPUT_AMOUNT,
                validAfter: 0,
                validBefore: FUTURE_DEADLINE,
                nonce: "0xabcd",
            },
        });
        expect(() => validateRelaySignatureEnvelope(envelope, params)).toThrowError(/to/);
    });
});
