import { GetQuoteRequest } from "@openintentsframework/oif-specs";
import { buildFromPayload } from "@wonderland/interop-addresses";
import { Address, Hex, toHex } from "viem";
import { describe, expect, it } from "vitest";

import { validateAcrossPayload } from "../../src/validators/acrossPayloadValidator.js";
import { ACROSS_DEPOSIT_FIXTURE, CHAIN_IDS, MAINNET_TOKENS } from "../mocks/fixtures.js";

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
    describe("SpokePool.deposit (simple bridge)", () => {
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

        it("returns true for unsupported selectors (cannot validate, allow through)", async () => {
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
            expect(await validateAcrossPayload(intent, "0x12345678")).toBe(true);
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
