import { GetQuoteRequest } from "@openintentsframework/oif-specs";
import { buildFromPayload } from "@wonderland/interop-addresses";
import { Address, Hex, toHex, zeroAddress } from "viem";
import { describe, expect, it } from "vitest";

import { validateAcrossPayload } from "../../src/validators/acrossPayloadValidator.js";
import {
    ATTACKER,
    encodeSwapAndBridge,
    OUTPUT_TOKEN,
    SWAP_TOKEN,
    USER,
} from "../helpers/maliciousCalldata.js";
import {
    ACROSS_DEPOSIT_FIXTURE,
    ACROSS_SWAP_AND_BRIDGE_FIXTURE,
    CHAIN_IDS,
    MAINNET_TOKENS,
} from "../mocks/fixtures.js";

const interopAddress = (chainId: number, address: Address): Promise<string> =>
    buildFromPayload({
        version: 1,
        chainType: "eip155",
        chainReference: toHex(chainId),
        address,
    });

interface IntentOverrides {
    inputUser?: string;
    inputAsset?: string;
    inputAmount?: string;
    outputReceiver?: string;
    outputAsset?: string;
}

describe("validateAcrossPayload", () => {
    describe("SpokePool.deposit", () => {
        const FIXTURE = ACROSS_DEPOSIT_FIXTURE;

        const createIntent = async (overrides?: IntentOverrides): Promise<GetQuoteRequest> => {
            const user = await interopAddress(CHAIN_IDS.ETHEREUM, FIXTURE.depositor);
            const inputAsset = await interopAddress(CHAIN_IDS.ETHEREUM, FIXTURE.inputToken);
            const outputAsset = await interopAddress(
                FIXTURE.destinationChainId,
                FIXTURE.outputToken,
            );

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
            const intent = await createIntent();
            expect(await validateAcrossPayload(intent, FIXTURE.calldata)).toBe(true);
        });

        it("returns false when recipient does not match", async () => {
            const attacker = await interopAddress(FIXTURE.destinationChainId, MAINNET_TOKENS.USDC);
            const intent = await createIntent({ outputReceiver: attacker });
            expect(await validateAcrossPayload(intent, FIXTURE.calldata)).toBe(false);
        });

        it("returns false when outputToken does not match", async () => {
            const wrongToken = await interopAddress(
                FIXTURE.destinationChainId,
                MAINNET_TOKENS.USDT,
            );
            const intent = await createIntent({ outputAsset: wrongToken });
            expect(await validateAcrossPayload(intent, FIXTURE.calldata)).toBe(false);
        });

        it("returns false when destinationChainId does not match", async () => {
            const wrongChain = await interopAddress(CHAIN_IDS.ARBITRUM, FIXTURE.outputToken);
            const intent = await createIntent({ outputAsset: wrongChain });
            expect(await validateAcrossPayload(intent, FIXTURE.calldata)).toBe(false);
        });

        it("returns false when depositor does not match", async () => {
            const wrongUser = await interopAddress(CHAIN_IDS.ETHEREUM, MAINNET_TOKENS.USDC);
            const intent = await createIntent({ inputUser: wrongUser });
            expect(await validateAcrossPayload(intent, FIXTURE.calldata)).toBe(false);
        });

        it("returns false when inputToken does not match", async () => {
            const wrongToken = await interopAddress(CHAIN_IDS.ETHEREUM, MAINNET_TOKENS.WETH);
            const intent = await createIntent({ inputAsset: wrongToken });
            expect(await validateAcrossPayload(intent, FIXTURE.calldata)).toBe(false);
        });

        it("returns false when inputAmount does not match", async () => {
            const intent = await createIntent({ inputAmount: "999" });
            expect(await validateAcrossPayload(intent, FIXTURE.calldata)).toBe(false);
        });
    });

    describe("SpokePoolPeriphery.swapAndBridge", () => {
        const FIXTURE = ACROSS_SWAP_AND_BRIDGE_FIXTURE;

        const createIntent = async (overrides?: IntentOverrides): Promise<GetQuoteRequest> => {
            const user = await interopAddress(CHAIN_IDS.ETHEREUM, FIXTURE.depositor);
            const inputAsset = await interopAddress(CHAIN_IDS.ETHEREUM, FIXTURE.swapToken);
            const outputAsset = await interopAddress(
                FIXTURE.destinationChainId,
                FIXTURE.outputToken,
            );

            return {
                user,
                intent: {
                    intentType: "oif-swap",
                    inputs: [
                        {
                            user: overrides?.inputUser ?? user,
                            asset: overrides?.inputAsset ?? inputAsset,
                            amount: overrides?.inputAmount ?? FIXTURE.swapTokenAmount,
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
            const intent = await createIntent();
            expect(await validateAcrossPayload(intent, FIXTURE.calldata)).toBe(true);
        });

        it("returns false when recipient does not match", async () => {
            const attacker = await interopAddress(FIXTURE.destinationChainId, MAINNET_TOKENS.USDC);
            const intent = await createIntent({ outputReceiver: attacker });
            expect(await validateAcrossPayload(intent, FIXTURE.calldata)).toBe(false);
        });

        it("returns false when swapToken does not match", async () => {
            const wrongToken = await interopAddress(CHAIN_IDS.ETHEREUM, MAINNET_TOKENS.USDC);
            const intent = await createIntent({ inputAsset: wrongToken });
            expect(await validateAcrossPayload(intent, FIXTURE.calldata)).toBe(false);
        });

        it("returns false when swapTokenAmount does not match", async () => {
            const intent = await createIntent({ inputAmount: "999" });
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

        it("returns false when calldata cannot be decoded", async () => {
            const intent: GetQuoteRequest = {
                user: "test",
                intent: {
                    intentType: "oif-swap",
                    inputs: [{ user: "test", asset: "test", amount: "1" }],
                    outputs: [{ receiver: "test", asset: "test" }],
                },
                supportedTypes: ["across"],
            };
            expect(await validateAcrossPayload(intent, "0x12345678")).toBe(false);
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

    describe("malicious calldata scenarios", () => {
        // User intent: send to themselves
        const createLegitIntent = async (): Promise<GetQuoteRequest> => {
            const user = await interopAddress(CHAIN_IDS.ETHEREUM, USER);
            const inputAsset = await interopAddress(CHAIN_IDS.ETHEREUM, SWAP_TOKEN);
            const outputAsset = await interopAddress(CHAIN_IDS.OPTIMISM, OUTPUT_TOKEN);

            return {
                user,
                intent: {
                    intentType: "oif-swap",
                    inputs: [{ user, asset: inputAsset, amount: "1000000000000000000" }],
                    outputs: [{ receiver: user, asset: outputAsset }],
                },
                supportedTypes: ["across"],
            };
        };

        it("passes with legitimate calldata (all drains to user, fallback to user)", async () => {
            const intent = await createLegitIntent();
            const calldata = encodeSwapAndBridge({
                swapToken: SWAP_TOKEN,
                swapTokenAmount: 1000000000000000000n,
                outputToken: OUTPUT_TOKEN,
                outputAmount: 3000000000n,
                depositor: USER,
                destinationChainId: 10n,
                drains: [
                    { token: OUTPUT_TOKEN, destination: USER },
                    { token: OUTPUT_TOKEN, destination: USER },
                ],
                fallbackRecipient: USER,
            });

            expect(await validateAcrossPayload(intent, calldata)).toBe(true);
        });

        it("rejects when one drain goes to attacker (split attack)", async () => {
            const intent = await createLegitIntent();
            const calldata = encodeSwapAndBridge({
                swapToken: SWAP_TOKEN,
                swapTokenAmount: 1000000000000000000n,
                outputToken: OUTPUT_TOKEN,
                outputAmount: 3000000000n,
                depositor: USER,
                destinationChainId: 10n,
                drains: [
                    { token: OUTPUT_TOKEN, destination: USER }, // small amount to user
                    { token: OUTPUT_TOKEN, destination: ATTACKER }, // majority to attacker
                ],
                fallbackRecipient: USER,
            });

            expect(await validateAcrossPayload(intent, calldata)).toBe(false);
        });

        it("rejects when all drains go to attacker", async () => {
            const intent = await createLegitIntent();
            const calldata = encodeSwapAndBridge({
                swapToken: SWAP_TOKEN,
                swapTokenAmount: 1000000000000000000n,
                outputToken: OUTPUT_TOKEN,
                outputAmount: 3000000000n,
                depositor: USER,
                destinationChainId: 10n,
                drains: [{ token: OUTPUT_TOKEN, destination: ATTACKER }],
                fallbackRecipient: USER,
            });

            expect(await validateAcrossPayload(intent, calldata)).toBe(false);
        });

        it("rejects when fallbackRecipient differs from drain recipient", async () => {
            const intent = await createLegitIntent();
            const calldata = encodeSwapAndBridge({
                swapToken: SWAP_TOKEN,
                swapTokenAmount: 1000000000000000000n,
                outputToken: OUTPUT_TOKEN,
                outputAmount: 3000000000n,
                depositor: USER,
                destinationChainId: 10n,
                drains: [{ token: OUTPUT_TOKEN, destination: USER }],
                fallbackRecipient: ATTACKER, // if drain fails, attacker gets funds
            });

            expect(await validateAcrossPayload(intent, calldata)).toBe(false);
        });

        it("rejects when no drains and fallbackRecipient is attacker", async () => {
            const intent = await createLegitIntent();
            const calldata = encodeSwapAndBridge({
                swapToken: SWAP_TOKEN,
                swapTokenAmount: 1000000000000000000n,
                outputToken: OUTPUT_TOKEN,
                outputAmount: 3000000000n,
                depositor: USER,
                destinationChainId: 10n,
                drains: [], // no drains
                fallbackRecipient: ATTACKER,
            });

            expect(await validateAcrossPayload(intent, calldata)).toBe(false);
        });

        it("rejects when no drains and fallbackRecipient is zero", async () => {
            const intent = await createLegitIntent();
            const calldata = encodeSwapAndBridge({
                swapToken: SWAP_TOKEN,
                swapTokenAmount: 1000000000000000000n,
                outputToken: OUTPUT_TOKEN,
                outputAmount: 3000000000n,
                depositor: USER,
                destinationChainId: 10n,
                drains: [],
                fallbackRecipient: zeroAddress, // funds stuck
            });

            expect(await validateAcrossPayload(intent, calldata)).toBe(false);
        });

        it("passes when fallbackRecipient is zero but drains go to user", async () => {
            const intent = await createLegitIntent();
            const calldata = encodeSwapAndBridge({
                swapToken: SWAP_TOKEN,
                swapTokenAmount: 1000000000000000000n,
                outputToken: OUTPUT_TOKEN,
                outputAmount: 3000000000n,
                depositor: USER,
                destinationChainId: 10n,
                drains: [{ token: OUTPUT_TOKEN, destination: USER }],
                fallbackRecipient: zeroAddress, // ok because drains work
            });

            expect(await validateAcrossPayload(intent, calldata)).toBe(true);
        });
    });
});
