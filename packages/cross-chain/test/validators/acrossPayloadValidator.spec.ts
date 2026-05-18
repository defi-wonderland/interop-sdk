import { GetQuoteRequest } from "@openintentsframework/oif-specs";
import { encodeAddress } from "@wonderland/interop-addresses";
import { Address, encodeFunctionData, Hex, pad } from "viem";
import { describe, expect, it } from "vitest";

import { addressToBytes32 } from "../../src/core/utils/addressHelpers.js";
import { ACROSS_SPOKE_POOL_DEPOSIT_ABI } from "../../src/protocols/across/constants.js";
import { validateAcrossPayload } from "../../src/protocols/across/validator.js";
import { ACROSS_DEPOSIT_FIXTURE, CHAIN_IDS, MAINNET_TOKENS } from "../mocks/fixtures.js";

const interopAddress = (chainId: number, address: Address): string =>
    encodeAddress(
        {
            version: 1,
            chainType: "eip155",
            chainReference: chainId.toString(),
            address,
        },
        { format: "hex" },
    ) as string;

interface IntentOverrides {
    inputUser?: string;
    inputAsset?: string;
    inputAmount?: string;
    outputReceiver?: string;
    outputAsset?: string;
}

describe("validateAcrossPayload", () => {
    describe("SpokePool.deposit (simple bridge)", () => {
        const FIXTURE = ACROSS_DEPOSIT_FIXTURE;

        const createIntent = (overrides?: IntentOverrides): GetQuoteRequest => {
            const user = interopAddress(CHAIN_IDS.ETHEREUM, FIXTURE.depositor);
            const inputAsset = interopAddress(CHAIN_IDS.ETHEREUM, FIXTURE.inputToken);
            const outputAsset = interopAddress(FIXTURE.destinationChainId, FIXTURE.outputToken);

            return {
                user,
                intent: {
                    intentType: "oif-swap",
                    inputs: [
                        {
                            user: overrides?.inputUser ?? user,
                            asset: overrides?.inputAsset ?? inputAsset,
                            amount: overrides?.inputAmount ?? FIXTURE.inputAmount,
                        },
                    ],
                    outputs: [
                        {
                            receiver: overrides?.outputReceiver ?? user,
                            asset: overrides?.outputAsset ?? outputAsset,
                        },
                    ],
                },
                supportedTypes: ["across"],
            };
        };

        it("returns true when all fields match", async () => {
            const intent = createIntent();
            expect(await validateAcrossPayload(intent, FIXTURE.calldata)).toBe(true);
        });

        it("returns false when recipient does not match", async () => {
            const attacker = interopAddress(FIXTURE.destinationChainId, MAINNET_TOKENS.USDC);
            const intent = createIntent({ outputReceiver: attacker });
            expect(await validateAcrossPayload(intent, FIXTURE.calldata)).toBe(false);
        });

        it("returns false when outputToken does not match", async () => {
            const wrongToken = interopAddress(FIXTURE.destinationChainId, MAINNET_TOKENS.USDT);
            const intent = createIntent({ outputAsset: wrongToken });
            expect(await validateAcrossPayload(intent, FIXTURE.calldata)).toBe(false);
        });

        it("returns false when destinationChainId does not match", async () => {
            const wrongChain = interopAddress(CHAIN_IDS.ARBITRUM, FIXTURE.outputToken);
            const intent = createIntent({ outputAsset: wrongChain });
            expect(await validateAcrossPayload(intent, FIXTURE.calldata)).toBe(false);
        });

        it("returns false when depositor does not match", async () => {
            const wrongUser = interopAddress(CHAIN_IDS.ETHEREUM, MAINNET_TOKENS.USDC);
            const intent = createIntent({ inputUser: wrongUser });
            expect(await validateAcrossPayload(intent, FIXTURE.calldata)).toBe(false);
        });

        it("returns false when inputToken does not match", async () => {
            const wrongToken = interopAddress(CHAIN_IDS.ETHEREUM, MAINNET_TOKENS.WETH);
            const intent = createIntent({ inputAsset: wrongToken });
            expect(await validateAcrossPayload(intent, FIXTURE.calldata)).toBe(false);
        });

        it("returns false when inputAmount does not match", async () => {
            const intent = createIntent({ inputAmount: "999" });
            expect(await validateAcrossPayload(intent, FIXTURE.calldata)).toBe(false);
        });
    });

    describe("edge cases", () => {
        it("returns false when data is empty", async () => {
            const intent: GetQuoteRequest = {
                user: "test",
                intent: {
                    intentType: "oif-swap",
                    inputs: [{ user: "test", asset: "test", amount: "1" }],
                    outputs: [{ receiver: "test", asset: "test" }],
                },
                supportedTypes: ["across"],
            };
            expect(await validateAcrossPayload(intent, "" as Hex)).toBe(false);
        });

        it("rejects calldata whose selector is not deposit", async () => {
            const intent: GetQuoteRequest = {
                user: "test",
                intent: {
                    intentType: "oif-swap",
                    inputs: [{ user: "test", asset: "test", amount: "1" }],
                    outputs: [{ receiver: "test", asset: "test" }],
                },
                supportedTypes: ["across"],
            };
            // 0x12345678 is not a known Across selector
            expect(await validateAcrossPayload(intent, "0x12345678")).toBe(false);
        });

        it("rejects deposit calldata that carries a non-empty message", async () => {
            const FIXTURE = ACROSS_DEPOSIT_FIXTURE;
            const user = interopAddress(CHAIN_IDS.ETHEREUM, FIXTURE.depositor);
            const intent: GetQuoteRequest = {
                user,
                intent: {
                    intentType: "oif-swap",
                    inputs: [
                        {
                            user,
                            asset: interopAddress(CHAIN_IDS.ETHEREUM, FIXTURE.inputToken),
                            amount: FIXTURE.inputAmount,
                        },
                    ],
                    outputs: [
                        {
                            receiver: user,
                            asset: interopAddress(FIXTURE.destinationChainId, FIXTURE.outputToken),
                        },
                    ],
                },
                supportedTypes: ["across"],
            };

            const calldataWithMessage = encodeFunctionData({
                abi: ACROSS_SPOKE_POOL_DEPOSIT_ABI,
                functionName: "deposit",
                args: [
                    addressToBytes32(FIXTURE.depositor),
                    addressToBytes32(FIXTURE.depositor),
                    addressToBytes32(FIXTURE.inputToken),
                    addressToBytes32(FIXTURE.outputToken),
                    BigInt(FIXTURE.inputAmount),
                    BigInt(FIXTURE.inputAmount),
                    BigInt(FIXTURE.destinationChainId),
                    pad("0x00" as Hex, { size: 32 }),
                    0,
                    0,
                    0,
                    "0xdeadbeef",
                ],
            });

            expect(await validateAcrossPayload(intent, calldataWithMessage)).toBe(false);
        });

        it("returns false when intent has no outputs", async () => {
            const intent: GetQuoteRequest = {
                user: "test",
                intent: {
                    intentType: "oif-swap",
                    inputs: [{ user: "test", asset: "test", amount: "1" }],
                    outputs: [],
                },
                supportedTypes: ["across"],
            };
            expect(await validateAcrossPayload(intent, ACROSS_DEPOSIT_FIXTURE.calldata)).toBe(
                false,
            );
        });

        it("returns false when intent has no inputs", async () => {
            const intent: GetQuoteRequest = {
                user: "test",
                intent: {
                    intentType: "oif-swap",
                    inputs: [],
                    outputs: [{ receiver: "test", asset: "test" }],
                },
                supportedTypes: ["across"],
            };
            expect(await validateAcrossPayload(intent, ACROSS_DEPOSIT_FIXTURE.calldata)).toBe(
                false,
            );
        });
    });
});
