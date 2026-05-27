import { encodeAddress } from "@wonderland/interop-addresses";
import { describe, expect, it } from "vitest";

import { adaptOifOrder } from "../../src/protocols/oif/adapters/orderAdapter.js";

function toErc7930(chainId: number, address: string): string {
    return encodeAddress(
        { version: 1, chainType: "eip155", chainReference: chainId.toString(), address },
        { format: "hex" },
    ) as string;
}

const PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
const USDC_MAINNET = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const FUTURE_DEADLINE = Math.floor(Date.now() / 1000) + 3600;

const VALID_PERMIT2_TYPES = {
    PermitBatchWitnessTransferFrom: [
        { name: "permitted", type: "TokenPermissions[]" },
        { name: "spender", type: "address" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
    ],
    TokenPermissions: [
        { name: "token", type: "address" },
        { name: "amount", type: "uint256" },
    ],
};

const VALID_PERMIT2_MESSAGE = {
    permitted: [{ token: USDC_MAINNET, amount: "1000000" }],
    spender: "0x52602D7cc3D833F5d28ee6D01C7F82C9b2322e10",
    nonce: "123",
    deadline: FUTURE_DEADLINE,
};

describe("orderAdapter", () => {
    describe("adaptOifOrder — oif-escrow-v0", () => {
        it("converts to a signature step with oif-escrow lock", () => {
            const oifOrder = {
                type: "oif-escrow-v0" as const,
                payload: {
                    signatureType: "eip712" as const,
                    domain: { name: "Permit2", chainId: 1, verifyingContract: PERMIT2 },
                    primaryType: "PermitBatchWitnessTransferFrom",
                    types: VALID_PERMIT2_TYPES,
                    message: VALID_PERMIT2_MESSAGE,
                },
            };

            const result = adaptOifOrder(oifOrder);

            expect(result.steps).toHaveLength(1);
            expect(result.steps[0]!.kind).toBe("signature");
            expect(result.lock).toEqual({ type: "oif-escrow" });

            const step = result.steps[0]!;
            if (step.kind === "signature") {
                expect(step.chainId).toBe(1);
                expect(step.signaturePayload.primaryType).toBe("PermitBatchWitnessTransferFrom");
                expect(step.signaturePayload.signatureType).toBe("eip712");
            }
        });

        it("extracts chainId from domain as number", () => {
            const oifOrder = {
                type: "oif-escrow-v0" as const,
                payload: {
                    signatureType: "eip712" as const,
                    domain: { chainId: 42161, verifyingContract: PERMIT2 },
                    primaryType: "PermitBatchWitnessTransferFrom",
                    types: VALID_PERMIT2_TYPES,
                    message: VALID_PERMIT2_MESSAGE,
                },
            };

            const result = adaptOifOrder(oifOrder);
            expect(result.steps[0]!.chainId).toBe(42161);
        });

        it("extracts chainId from domain as string", () => {
            const oifOrder = {
                type: "oif-escrow-v0" as const,
                payload: {
                    signatureType: "eip712" as const,
                    domain: { chainId: "137", verifyingContract: PERMIT2 },
                    primaryType: "PermitBatchWitnessTransferFrom",
                    types: VALID_PERMIT2_TYPES,
                    message: VALID_PERMIT2_MESSAGE,
                },
            };

            const result = adaptOifOrder(oifOrder);
            expect(result.steps[0]!.chainId).toBe(137);
        });

        it("rejects when chainId is missing from domain", () => {
            const oifOrder = {
                type: "oif-escrow-v0" as const,
                payload: {
                    signatureType: "eip712" as const,
                    domain: { name: "NoDomain", verifyingContract: PERMIT2 },
                    primaryType: "PermitBatchWitnessTransferFrom",
                    types: VALID_PERMIT2_TYPES,
                    message: VALID_PERMIT2_MESSAGE,
                },
            };

            expect(() => adaptOifOrder(oifOrder)).toThrow(/chainId/);
        });
    });

    describe("adaptOifOrder — oif-3009-v0", () => {
        it("converts to a signature step with metadata and oif-escrow lock", () => {
            const oifOrder = {
                type: "oif-3009-v0" as const,
                payload: {
                    signatureType: "eip712" as const,
                    domain: {
                        name: "USD Coin",
                        version: "2",
                        chainId: 1,
                        verifyingContract: USDC_MAINNET,
                    },
                    primaryType: "TransferWithAuthorization",
                    types: {
                        TransferWithAuthorization: [
                            { name: "from", type: "address" },
                            { name: "to", type: "address" },
                            { name: "value", type: "uint256" },
                        ],
                    },
                    message: { from: "0xabc", to: "0xdef", value: "1000000" },
                },
                metadata: { orderHash: "0x123", chainId: 1, tokenAddress: USDC_MAINNET },
            };

            const result = adaptOifOrder(oifOrder);

            expect(result.steps).toHaveLength(1);
            expect(result.steps[0]!.kind).toBe("signature");
            expect(result.lock).toEqual({ type: "oif-escrow" });

            const step = result.steps[0]!;
            if (step.kind === "signature") {
                expect(step.metadata).toEqual({
                    orderHash: "0x123",
                    chainId: 1,
                    tokenAddress: USDC_MAINNET,
                });
            }
        });
    });

    describe("adaptOifOrder — oif-resource-lock-v0", () => {
        it("converts to a signature step with compact-resource-lock", () => {
            const oifOrder = {
                type: "oif-resource-lock-v0" as const,
                payload: {
                    signatureType: "eip712" as const,
                    domain: { name: "The Compact", version: "1", chainId: 8453 },
                    primaryType: "BatchCompact",
                    types: { BatchCompact: [{ name: "arbiter", type: "address" }] },
                    message: { arbiter: "0xabc" },
                },
            };

            const result = adaptOifOrder(oifOrder);

            expect(result.steps).toHaveLength(1);
            expect(result.steps[0]!.kind).toBe("signature");
            expect(result.lock).toEqual({ type: "compact-resource-lock" });
            expect(result.steps[0]!.chainId).toBe(8453);
        });
    });

    describe("adaptOifOrder — oif-user-open-v0", () => {
        const CONTRACT_ADDRESS = "0x1234567890123456789012345678901234567890";
        const TOKEN_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
        const USER_ADDRESS = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
        const SPENDER_ADDRESS = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";

        function createUserOpenOrder(overrides?: {
            to?: string;
            data?: Uint8Array;
            allowances?: Array<{
                token: string;
                user: string;
                spender: string;
                required: string;
            }>;
        }): {
            type: "oif-user-open-v0";
            openIntentTx: { to: string; data: Uint8Array; gasRequired: string };
            checks: {
                allowances: Array<{
                    token: string;
                    user: string;
                    spender: string;
                    required: string;
                }>;
            };
        } {
            return {
                type: "oif-user-open-v0" as const,
                openIntentTx: {
                    to: overrides?.to ?? toErc7930(1, CONTRACT_ADDRESS),
                    data: overrides?.data ?? new Uint8Array([0xab, 0xcd, 0xef]),
                    gasRequired: "250000",
                },
                checks: {
                    allowances: overrides?.allowances ?? [
                        {
                            token: toErc7930(1, TOKEN_ADDRESS),
                            user: toErc7930(1, USER_ADDRESS),
                            spender: toErc7930(1, SPENDER_ADDRESS),
                            required: "1000000",
                        },
                    ],
                },
            };
        }

        it("maps transaction fields from openIntentTx", () => {
            const result = adaptOifOrder(createUserOpenOrder());

            expect(result.steps).toHaveLength(1);
            expect(result.steps[0]!.kind).toBe("transaction");

            const step = result.steps[0]!;
            if (step.kind === "transaction") {
                expect(step.transaction.to.toLowerCase()).toBe(CONTRACT_ADDRESS);
                expect(step.transaction.gas).toBe("250000");
                expect(step.transaction.data).toBe("0xabcdef");
            }
        });

        it("extracts chainId from ERC-7930 openIntentTx.to", () => {
            const result = adaptOifOrder(createUserOpenOrder());

            expect(result.steps[0]!.kind).toBe("transaction");
            expect(result.steps[0]!.chainId).toBe(1);
        });

        it("converts allowances with ERC-7930 addresses", () => {
            const result = adaptOifOrder(createUserOpenOrder());

            expect(result.checks).toBeDefined();
            expect(result.checks!.allowances).toHaveLength(1);
            const allowance = result.checks!.allowances![0]!;
            expect(allowance.chainId).toBe(1);
            expect(allowance.tokenAddress.toLowerCase()).toBe(TOKEN_ADDRESS.toLowerCase());
            expect(allowance.owner.toLowerCase()).toBe(USER_ADDRESS.toLowerCase());
            expect(allowance.spender.toLowerCase()).toBe(SPENDER_ADDRESS.toLowerCase());
            expect(allowance.required).toBe("1000000");
        });

        it("falls back to chainId 0 for non-ERC-7930 to address", () => {
            const result = adaptOifOrder(
                createUserOpenOrder({
                    to: CONTRACT_ADDRESS,
                    data: new Uint8Array([0x00]),
                    allowances: [],
                }),
            );

            expect(result.steps[0]!.kind).toBe("transaction");
            expect(result.steps[0]!.chainId).toBe(0);
            if (result.steps[0]!.kind === "transaction") {
                expect(result.steps[0]!.transaction.to).toBe(CONTRACT_ADDRESS);
            }
        });

        it("has no checks when allowances array is empty", () => {
            const result = adaptOifOrder(
                createUserOpenOrder({ data: new Uint8Array([]), allowances: [] }),
            );

            expect(result.checks).toBeUndefined();
        });
    });

    describe("adaptOifOrder — unknown type", () => {
        it("throws for unknown order type", () => {
            const unknownOrder = { type: "unknown-v0" } as never;
            expect(() => adaptOifOrder(unknownOrder)).toThrow("Unknown OIF order type");
        });
    });
});
