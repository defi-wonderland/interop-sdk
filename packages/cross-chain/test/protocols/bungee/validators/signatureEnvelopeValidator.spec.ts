import { describe, expect, it } from "vitest";

import type { QuoteRequest } from "../../../../src/core/schemas/quoteRequest.js";
import type { Eip712Envelope } from "../../../../src/core/types/eip712.js";
import { PERMIT2_ADDRESS } from "../../../../src/core/constants/eip712.js";
import { Eip712EnvelopeMismatch } from "../../../../src/core/errors/Eip712EnvelopeMismatch.exception.js";
import { NATIVE_ASSET_ADDRESS } from "../../../../src/core/utils/token.js";
import { validateBungeeSignatureEnvelope } from "../../../../src/protocols/bungee/validators/signatureEnvelopeValidator.js";

const USER = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const TOKEN = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const OUTPUT_TOKEN = "0x0b2c639c533813f4aa9d7837caf62653d097ff85";
const RECEIVER = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb8";
const BUNGEE_GATEWAY = "0xCDeA28EE7bd5bf7710b294d9391E1B6A318D809a";

const ORIGIN_CHAIN_ID = 1;
const DESTINATION_CHAIN_ID = 10;
const INPUT_AMOUNT = "1000000";
const FUTURE_DEADLINE = Math.floor(Date.now() / 1000) + 3600;

function makeParams(overrides?: Partial<QuoteRequest>): QuoteRequest {
    return {
        user: USER,
        input: { chainId: ORIGIN_CHAIN_ID, assetAddress: TOKEN, amount: INPUT_AMOUNT },
        output: {
            chainId: DESTINATION_CHAIN_ID,
            assetAddress: OUTPUT_TOKEN,
            recipient: RECEIVER,
        },
        ...overrides,
    };
}

function makeBasicReq(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        originChainId: ORIGIN_CHAIN_ID,
        destinationChainId: DESTINATION_CHAIN_ID,
        deadline: FUTURE_DEADLINE,
        nonce: "1",
        sender: USER,
        receiver: RECEIVER,
        delegate: USER,
        bungeeGateway: BUNGEE_GATEWAY,
        switchboardId: 1,
        inputToken: TOKEN,
        inputAmount: INPUT_AMOUNT,
        outputToken: OUTPUT_TOKEN,
        minOutputAmount: "0",
        refuelAmount: "0",
        ...overrides,
    };
}

function makeEnvelope(
    messageOverrides: Record<string, unknown> = {},
    envelopeOverrides: Partial<Eip712Envelope> = {},
): Eip712Envelope {
    return {
        domain: {
            name: "Permit2",
            chainId: ORIGIN_CHAIN_ID,
            verifyingContract: PERMIT2_ADDRESS,
        },
        primaryType: "PermitWitnessTransferFrom",
        types: {},
        message: {
            permitted: { token: TOKEN, amount: INPUT_AMOUNT },
            spender: BUNGEE_GATEWAY,
            nonce: "1",
            deadline: FUTURE_DEADLINE,
            witness: { basicReq: makeBasicReq() },
            ...messageOverrides,
        },
        ...envelopeOverrides,
    };
}

describe("validateBungeeSignatureEnvelope", () => {
    it("accepts a valid Permit2 envelope with full witness", () => {
        expect(() => validateBungeeSignatureEnvelope(makeEnvelope(), makeParams())).not.toThrow();
    });

    it("defaults the expected receiver to the user when params.output.recipient is omitted", () => {
        const params = makeParams({
            output: { chainId: DESTINATION_CHAIN_ID, assetAddress: OUTPUT_TOKEN },
        });
        const envelope = makeEnvelope({
            witness: { basicReq: makeBasicReq({ receiver: USER }) },
        });
        expect(() => validateBungeeSignatureEnvelope(envelope, params)).not.toThrow();
    });

    it("accepts the EIP-7528 native placeholder as the witness outputToken when params output is zero address", () => {
        const params = makeParams({
            output: {
                chainId: DESTINATION_CHAIN_ID,
                assetAddress: "0x0000000000000000000000000000000000000000",
                recipient: RECEIVER,
            },
        });
        const envelope = makeEnvelope({
            witness: { basicReq: makeBasicReq({ outputToken: NATIVE_ASSET_ADDRESS }) },
        });
        expect(() => validateBungeeSignatureEnvelope(envelope, params)).not.toThrow();
    });

    it("rejects a primary type outside the Bungee allow-list", () => {
        const envelope = makeEnvelope({}, { primaryType: "PermitTransferFrom" });
        expect(() => validateBungeeSignatureEnvelope(envelope, makeParams())).toThrowError(
            /primaryType/,
        );
    });

    it("rejects an envelope when the input asset is the native placeholder", () => {
        const params = makeParams({
            input: {
                chainId: ORIGIN_CHAIN_ID,
                assetAddress: NATIVE_ASSET_ADDRESS,
                amount: INPUT_AMOUNT,
            },
        });
        expect(() => validateBungeeSignatureEnvelope(makeEnvelope(), params)).toThrow(
            Eip712EnvelopeMismatch,
        );
    });

    it("rejects a Permit2 envelope whose domain carries `version`", () => {
        const envelope = makeEnvelope(
            {},
            {
                domain: {
                    name: "Permit2",
                    chainId: ORIGIN_CHAIN_ID,
                    verifyingContract: PERMIT2_ADDRESS,
                    version: "1",
                },
            },
        );
        expect(() => validateBungeeSignatureEnvelope(envelope, makeParams())).toThrowError(
            /domainVersion/,
        );
    });

    it("rejects a tampered domain chainId", () => {
        const envelope = makeEnvelope(
            {},
            {
                domain: { name: "Permit2", chainId: 137, verifyingContract: PERMIT2_ADDRESS },
            },
        );
        expect(() => validateBungeeSignatureEnvelope(envelope, makeParams())).toThrowError(
            /chainId/,
        );
    });

    it("rejects a Permit2 envelope whose verifyingContract is not canonical Permit2", () => {
        const envelope = makeEnvelope(
            {},
            {
                domain: {
                    name: "Permit2",
                    chainId: ORIGIN_CHAIN_ID,
                    verifyingContract: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
                },
            },
        );
        expect(() => validateBungeeSignatureEnvelope(envelope, makeParams())).toThrowError(
            /verifyingContract/,
        );
    });

    it("rejects when the envelope spender equals the user", () => {
        const envelope = makeEnvelope({ spender: USER });
        expect(() => validateBungeeSignatureEnvelope(envelope, makeParams())).toThrowError(
            /spender/,
        );
    });

    it("rejects when the envelope spender is missing", () => {
        const envelope: Eip712Envelope = {
            domain: {
                name: "Permit2",
                chainId: ORIGIN_CHAIN_ID,
                verifyingContract: PERMIT2_ADDRESS,
            },
            primaryType: "PermitWitnessTransferFrom",
            types: {},
            message: {
                permitted: { token: TOKEN, amount: INPUT_AMOUNT },
                nonce: "1",
                deadline: FUTURE_DEADLINE,
                witness: { basicReq: makeBasicReq() },
            },
        };
        expect(() => validateBungeeSignatureEnvelope(envelope, makeParams())).toThrowError(
            /spender/,
        );
    });

    it("rejects a tampered permitted.token", () => {
        const envelope = makeEnvelope({
            permitted: {
                token: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
                amount: INPUT_AMOUNT,
            },
        });
        expect(() => validateBungeeSignatureEnvelope(envelope, makeParams())).toThrowError(/token/);
    });

    it("rejects an inflated permitted.amount", () => {
        const envelope = makeEnvelope({
            permitted: { token: TOKEN, amount: "99999999999" },
        });
        expect(() => validateBungeeSignatureEnvelope(envelope, makeParams())).toThrowError(
            /amount/,
        );
    });

    it("rejects an expired deadline", () => {
        const envelope = makeEnvelope({ deadline: Math.floor(Date.now() / 1000) - 3600 });
        expect(() => validateBungeeSignatureEnvelope(envelope, makeParams())).toThrowError(
            /deadline/,
        );
    });

    it("rejects when witness object is missing", () => {
        const envelope: Eip712Envelope = {
            domain: {
                name: "Permit2",
                chainId: ORIGIN_CHAIN_ID,
                verifyingContract: PERMIT2_ADDRESS,
            },
            primaryType: "PermitWitnessTransferFrom",
            types: {},
            message: {
                permitted: { token: TOKEN, amount: INPUT_AMOUNT },
                spender: BUNGEE_GATEWAY,
                nonce: "1",
                deadline: FUTURE_DEADLINE,
            },
        };
        expect(() => validateBungeeSignatureEnvelope(envelope, makeParams())).toThrow(
            Eip712EnvelopeMismatch,
        );
    });

    it("rejects when witness.basicReq is missing", () => {
        const envelope = makeEnvelope({ witness: { otherField: "x" } });
        expect(() => validateBungeeSignatureEnvelope(envelope, makeParams())).toThrow(
            Eip712EnvelopeMismatch,
        );
    });

    it("rejects when witness.basicReq.sender differs from the user", () => {
        const envelope = makeEnvelope({
            witness: { basicReq: makeBasicReq({ sender: RECEIVER }) },
        });
        expect(() => validateBungeeSignatureEnvelope(envelope, makeParams())).toThrowError(/user/);
    });

    it("rejects when witness.basicReq.receiver differs from params.output.recipient", () => {
        const envelope = makeEnvelope({
            witness: { basicReq: makeBasicReq({ receiver: USER }) },
        });
        expect(() => validateBungeeSignatureEnvelope(envelope, makeParams())).toThrowError(
            /recipient/,
        );
    });

    it("rejects when witness.basicReq.originChainId mismatches params.input.chainId", () => {
        const envelope = makeEnvelope({
            witness: { basicReq: makeBasicReq({ originChainId: 137 }) },
        });
        expect(() => validateBungeeSignatureEnvelope(envelope, makeParams())).toThrowError(
            /chainId/,
        );
    });

    it("rejects when witness.basicReq.destinationChainId mismatches params.output.chainId", () => {
        const envelope = makeEnvelope({
            witness: { basicReq: makeBasicReq({ destinationChainId: 42161 }) },
        });
        expect(() => validateBungeeSignatureEnvelope(envelope, makeParams())).toThrowError(
            /chainId/,
        );
    });

    it("rejects when witness.basicReq.inputToken mismatches params.input.assetAddress", () => {
        const envelope = makeEnvelope({
            witness: {
                basicReq: makeBasicReq({
                    inputToken: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
                }),
            },
        });
        expect(() => validateBungeeSignatureEnvelope(envelope, makeParams())).toThrowError(/token/);
    });

    it("rejects when witness.basicReq.outputToken mismatches params.output.assetAddress", () => {
        const envelope = makeEnvelope({
            witness: {
                basicReq: makeBasicReq({
                    outputToken: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
                }),
            },
        });
        expect(() => validateBungeeSignatureEnvelope(envelope, makeParams())).toThrowError(/token/);
    });

    it("rejects when witness.basicReq.inputAmount exceeds params.input.amount", () => {
        const envelope = makeEnvelope({
            witness: { basicReq: makeBasicReq({ inputAmount: "99999999999" }) },
        });
        expect(() => validateBungeeSignatureEnvelope(envelope, makeParams())).toThrowError(
            /amount/,
        );
    });

    it("rejects when witness.basicReq.bungeeGateway diverges from values.spender", () => {
        const envelope = makeEnvelope({
            witness: {
                basicReq: makeBasicReq({
                    bungeeGateway: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
                }),
            },
        });
        expect(() => validateBungeeSignatureEnvelope(envelope, makeParams())).toThrowError(
            /spender/,
        );
    });
});
