import type { Oif3009Order, OifEscrowOrder } from "@openintentsframework/oif-specs";
import { describe, expect, it } from "vitest";

import type { QuoteRequest } from "../../../../src/core/schemas/quoteRequest.js";
import { PERMIT2_ADDRESS } from "../../../../src/core/constants/eip712.js";
import { NATIVE_ASSET_ADDRESS } from "../../../../src/core/utils/token.js";
import {
    validateOif3009SignatureEnvelope,
    validateOifEscrowSignatureEnvelope,
} from "../../../../src/protocols/oif/validators/signatureEnvelopeValidator.js";

const USDC_MAINNET = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const TOKEN = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const OTHER_TOKEN = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const USER = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const RECIPIENT = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb8";
const ORIGIN_CHAIN_ID = 1;
const DESTINATION_CHAIN_ID = 10;
const INPUT_AMOUNT = "1000000";
const FUTURE = Math.floor(Date.now() / 1000) + 3600;
const PAST = Math.floor(Date.now() / 1000) - 3600;

function makeParams(overrides?: Partial<QuoteRequest>): QuoteRequest {
    return {
        user: USER,
        input: { chainId: ORIGIN_CHAIN_ID, assetAddress: TOKEN, amount: INPUT_AMOUNT },
        output: { chainId: DESTINATION_CHAIN_ID, assetAddress: TOKEN, recipient: RECIPIENT },
        ...overrides,
    };
}

function makeEscrowOrder(overrides?: {
    primaryType?: string;
    domain?: Record<string, unknown>;
    message?: Record<string, unknown>;
}): OifEscrowOrder {
    return {
        type: "oif-escrow-v0",
        payload: {
            signatureType: "eip712",
            domain: overrides?.domain ?? {
                name: "Permit2",
                chainId: 1,
                verifyingContract: PERMIT2_ADDRESS,
            },
            primaryType: overrides?.primaryType ?? "PermitBatchWitnessTransferFrom",
            types: {},
            message: overrides?.message ?? {
                permitted: [{ token: TOKEN, amount: "1000000" }],
                spender: "0x52602D7cc3D833F5d28ee6D01C7F82C9b2322e10",
                nonce: "1",
                deadline: FUTURE,
            },
        },
    };
}

function make3009Order(overrides?: {
    primaryType?: string;
    domain?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
}): Oif3009Order {
    return {
        type: "oif-3009-v0",
        payload: {
            signatureType: "eip712",
            domain: overrides?.domain ?? {
                name: "USD Coin",
                version: "2",
                chainId: 1,
                verifyingContract: USDC_MAINNET,
            },
            primaryType: overrides?.primaryType ?? "TransferWithAuthorization",
            types: {},
            message: { from: "0xabc", to: "0xdef", value: "1000000" },
        },
        metadata: overrides?.metadata ?? { chainId: 1, tokenAddress: USDC_MAINNET },
    };
}

describe("validateOifEscrowSignatureEnvelope", () => {
    it("accepts a valid escrow envelope", () => {
        expect(() => validateOifEscrowSignatureEnvelope(makeEscrowOrder())).not.toThrow();
    });

    it("rejects a non-PermitBatchWitnessTransferFrom primaryType", () => {
        expect(() =>
            validateOifEscrowSignatureEnvelope(
                makeEscrowOrder({ primaryType: "PermitTransferFrom" }),
            ),
        ).toThrowError(/primaryType/);
    });

    it("rejects a non-canonical Permit2 verifyingContract", () => {
        expect(() =>
            validateOifEscrowSignatureEnvelope(
                makeEscrowOrder({
                    domain: {
                        chainId: 1,
                        verifyingContract: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
                    },
                }),
            ),
        ).toThrowError(/verifyingContract/);
    });

    it("rejects a missing chainId", () => {
        expect(() =>
            validateOifEscrowSignatureEnvelope(
                makeEscrowOrder({
                    domain: { name: "Permit2", verifyingContract: PERMIT2_ADDRESS },
                }),
            ),
        ).toThrowError(/chainId/);
    });

    it("rejects when domain carries `version` (Permit2 has none)", () => {
        expect(() =>
            validateOifEscrowSignatureEnvelope(
                makeEscrowOrder({
                    domain: { chainId: 1, verifyingContract: PERMIT2_ADDRESS, version: "1" },
                }),
            ),
        ).toThrowError(/domainVersion/);
    });

    it("rejects an expired deadline", () => {
        expect(() =>
            validateOifEscrowSignatureEnvelope(
                makeEscrowOrder({
                    message: {
                        permitted: [{ token: TOKEN, amount: "1000000" }],
                        spender: "0x52602D7cc3D833F5d28ee6D01C7F82C9b2322e10",
                        nonce: "1",
                        deadline: PAST,
                    },
                }),
            ),
        ).toThrowError(/deadline/);
    });

    describe("with QuoteRequest cross-checks", () => {
        it("accepts an envelope that matches the user-supplied request", () => {
            expect(() =>
                validateOifEscrowSignatureEnvelope(makeEscrowOrder(), makeParams()),
            ).not.toThrow();
        });

        it("rejects a chainId mismatch against params.input.chainId", () => {
            const tampered = makeEscrowOrder({
                domain: { name: "Permit2", chainId: 137, verifyingContract: PERMIT2_ADDRESS },
            });
            expect(() => validateOifEscrowSignatureEnvelope(tampered, makeParams())).toThrowError(
                /chainId/,
            );
        });

        it("rejects a permitted token that differs from params.input.assetAddress", () => {
            const tampered = makeEscrowOrder({
                message: {
                    permitted: [{ token: OTHER_TOKEN, amount: "1000000" }],
                    spender: "0x52602D7cc3D833F5d28ee6D01C7F82C9b2322e10",
                    nonce: "1",
                    deadline: FUTURE,
                },
            });
            expect(() => validateOifEscrowSignatureEnvelope(tampered, makeParams())).toThrowError(
                /token/,
            );
        });

        it("rejects an amount inflated beyond params.input.amount", () => {
            const tampered = makeEscrowOrder({
                message: {
                    permitted: [{ token: TOKEN, amount: "9999999999" }],
                    spender: "0x52602D7cc3D833F5d28ee6D01C7F82C9b2322e10",
                    nonce: "1",
                    deadline: FUTURE,
                },
            });
            expect(() => validateOifEscrowSignatureEnvelope(tampered, makeParams())).toThrowError(
                /amount/,
            );
        });

        it("rejects when the user requested a native input asset", () => {
            const params = makeParams({
                input: {
                    chainId: ORIGIN_CHAIN_ID,
                    assetAddress: NATIVE_ASSET_ADDRESS,
                    amount: INPUT_AMOUNT,
                },
            });
            expect(() =>
                validateOifEscrowSignatureEnvelope(makeEscrowOrder(), params),
            ).toThrowError(/native/);
        });
    });
});

describe("validateOif3009SignatureEnvelope", () => {
    it("accepts a valid 3009 envelope", () => {
        expect(() => validateOif3009SignatureEnvelope(make3009Order())).not.toThrow();
    });

    it("rejects a primaryType outside the EIP-3009 allow-list", () => {
        expect(() =>
            validateOif3009SignatureEnvelope(make3009Order({ primaryType: "Permit" })),
        ).toThrowError(/primaryType/);
    });

    it("rejects when verifyingContract differs from metadata.tokenAddress", () => {
        expect(() =>
            validateOif3009SignatureEnvelope(
                make3009Order({
                    domain: {
                        version: "2",
                        chainId: 1,
                        verifyingContract: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
                    },
                }),
            ),
        ).toThrowError(/verifyingContract/);
    });

    it("rejects when domain.chainId differs from metadata.chainId", () => {
        expect(() =>
            validateOif3009SignatureEnvelope(
                make3009Order({
                    domain: {
                        version: "2",
                        chainId: 137,
                        verifyingContract: USDC_MAINNET,
                    },
                }),
            ),
        ).toThrowError(/chainId/);
    });

    it("rejects when metadata.tokenAddress is missing", () => {
        expect(() =>
            validateOif3009SignatureEnvelope(make3009Order({ metadata: { chainId: 1 } })),
        ).toThrowError(/tokenAddress/);
    });

    it("rejects when domain.version is absent", () => {
        expect(() =>
            validateOif3009SignatureEnvelope(
                make3009Order({
                    domain: { chainId: 1, verifyingContract: USDC_MAINNET },
                }),
            ),
        ).toThrowError(/domainVersion/);
    });

    describe("with QuoteRequest cross-checks", () => {
        function make3009OrderWithFrom(from: string, value = INPUT_AMOUNT): Oif3009Order {
            return {
                type: "oif-3009-v0",
                payload: {
                    signatureType: "eip712",
                    domain: {
                        name: "USD Coin",
                        version: "2",
                        chainId: ORIGIN_CHAIN_ID,
                        verifyingContract: USDC_MAINNET,
                    },
                    primaryType: "TransferWithAuthorization",
                    types: {},
                    message: {
                        from,
                        to: "0x52602D7cc3D833F5d28ee6D01C7F82C9b2322e10",
                        value,
                        validAfter: 0,
                        validBefore: FUTURE,
                        nonce: "0xabcd",
                    },
                },
                metadata: { chainId: ORIGIN_CHAIN_ID, tokenAddress: USDC_MAINNET },
            };
        }

        const validParams = makeParams({
            input: {
                chainId: ORIGIN_CHAIN_ID,
                assetAddress: USDC_MAINNET,
                amount: INPUT_AMOUNT,
            },
        });

        it("accepts an envelope that matches the user-supplied request", () => {
            expect(() =>
                validateOif3009SignatureEnvelope(make3009OrderWithFrom(USER), validParams),
            ).not.toThrow();
        });

        it("rejects when metadata.chainId differs from params.input.chainId", () => {
            const params = makeParams({
                input: { chainId: 137, assetAddress: USDC_MAINNET, amount: INPUT_AMOUNT },
            });
            expect(() =>
                validateOif3009SignatureEnvelope(make3009OrderWithFrom(USER), params),
            ).toThrowError(/chainId/);
        });

        it("rejects when metadata.tokenAddress differs from params.input.assetAddress", () => {
            const params = makeParams({
                input: {
                    chainId: ORIGIN_CHAIN_ID,
                    assetAddress: OTHER_TOKEN,
                    amount: INPUT_AMOUNT,
                },
            });
            expect(() =>
                validateOif3009SignatureEnvelope(make3009OrderWithFrom(USER), params),
            ).toThrowError(/token/);
        });

        it("rejects when message.from differs from params.user", () => {
            expect(() =>
                validateOif3009SignatureEnvelope(
                    make3009OrderWithFrom("0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef"),
                    validParams,
                ),
            ).toThrowError(/user/);
        });

        it("rejects when message.value exceeds params.input.amount", () => {
            expect(() =>
                validateOif3009SignatureEnvelope(
                    make3009OrderWithFrom(USER, "999999999999"),
                    validParams,
                ),
            ).toThrowError(/amount/);
        });

        it("rejects when the user requested a native input asset", () => {
            const params = makeParams({
                input: {
                    chainId: ORIGIN_CHAIN_ID,
                    assetAddress: NATIVE_ASSET_ADDRESS,
                    amount: INPUT_AMOUNT,
                },
            });
            expect(() =>
                validateOif3009SignatureEnvelope(make3009OrderWithFrom(USER), params),
            ).toThrowError(/native/);
        });
    });
});
