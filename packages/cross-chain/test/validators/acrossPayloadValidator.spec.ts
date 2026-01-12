import { GetQuoteRequest } from "@openintentsframework/oif-specs";
import { buildFromPayload } from "@wonderland/interop-addresses";
import { Address, Hex, toHex } from "viem";
import { describe, expect, it } from "vitest";

import { validateAcrossPayload } from "../../src/validators/acrossPayloadValidator.js";
import { CHAIN_IDS, MAINNET_TOKENS, REAL_ACROSS_API_RESPONSE } from "../mocks/fixtures.js";

const interopAddress = (chainId: number, address: Address): Promise<string> =>
    buildFromPayload({
        version: 1,
        chainType: "eip155",
        chainReference: toHex(chainId),
        address,
    });

const VITALIK = REAL_ACROSS_API_RESPONSE.depositor;
const USDC_MAINNET = REAL_ACROSS_API_RESPONSE.inputToken;
const USDC_OPTIMISM = REAL_ACROSS_API_RESPONSE.outputToken;
const REAL_CALLDATA = REAL_ACROSS_API_RESPONSE.calldata;

interface IntentOverrides {
    inputUser?: string;
    inputAsset?: string;
    inputAmount?: string;
    outputReceiver?: string;
    outputAsset?: string;
}

const createIntent = async (overrides?: IntentOverrides): Promise<GetQuoteRequest> => {
    const vitalik = await interopAddress(CHAIN_IDS.ETHEREUM, VITALIK);
    const usdcMainnet = await interopAddress(CHAIN_IDS.ETHEREUM, USDC_MAINNET);
    const usdcOptimism = await interopAddress(CHAIN_IDS.OPTIMISM, USDC_OPTIMISM);

    return {
        user: vitalik,
        intent: {
            intentType: "oif-swap",
            inputs: [
                {
                    user: overrides?.inputUser ?? vitalik,
                    asset: overrides?.inputAsset ?? usdcMainnet,
                    amount: overrides?.inputAmount ?? REAL_ACROSS_API_RESPONSE.inputAmount,
                },
            ],
            outputs: [
                {
                    receiver: overrides?.outputReceiver ?? vitalik,
                    asset: overrides?.outputAsset ?? usdcOptimism,
                },
            ],
        },
        supportedTypes: ["across"],
    };
};

describe("validateAcrossPayload", () => {
    describe("early returns", () => {
        it("returns false when data is empty", async () => {
            const intent = await createIntent();
            expect(await validateAcrossPayload(intent, "" as Hex)).toBe(false);
        });

        it("returns false when calldata cannot be decoded", async () => {
            const intent = await createIntent();
            expect(await validateAcrossPayload(intent, "0x12345678")).toBe(false);
        });

        it("returns false when intent has no outputs", async () => {
            const intent = await createIntent();
            intent.intent.outputs = [];
            expect(await validateAcrossPayload(intent, REAL_CALLDATA)).toBe(false);
        });

        it("returns false when intent has no inputs", async () => {
            const intent = await createIntent();
            intent.intent.inputs = [];
            expect(await validateAcrossPayload(intent, REAL_CALLDATA)).toBe(false);
        });
    });

    describe("mandatory field validation", () => {
        it("returns true when all fields match", async () => {
            const intent = await createIntent();
            expect(await validateAcrossPayload(intent, REAL_CALLDATA)).toBe(true);
        });

        it("returns false when recipient does not match", async () => {
            const attacker = await interopAddress(
                CHAIN_IDS.OPTIMISM,
                "0x0000000000000000000000000000000000000001",
            );
            const intent = await createIntent({ outputReceiver: attacker });

            expect(await validateAcrossPayload(intent, REAL_CALLDATA)).toBe(false);
        });

        it("returns false when outputToken does not match", async () => {
            const wrongToken = await interopAddress(CHAIN_IDS.OPTIMISM, MAINNET_TOKENS.USDT);
            const intent = await createIntent({ outputAsset: wrongToken });

            expect(await validateAcrossPayload(intent, REAL_CALLDATA)).toBe(false);
        });

        it("returns false when destinationChainId does not match", async () => {
            const wrongChainToken = await interopAddress(CHAIN_IDS.ARBITRUM, USDC_OPTIMISM);
            const intent = await createIntent({ outputAsset: wrongChainToken });

            expect(await validateAcrossPayload(intent, REAL_CALLDATA)).toBe(false);
        });

        it("returns false when depositor does not match", async () => {
            const wrongUser = await interopAddress(
                CHAIN_IDS.ETHEREUM,
                "0x0000000000000000000000000000000000000001",
            );
            const intent = await createIntent({ inputUser: wrongUser });

            expect(await validateAcrossPayload(intent, REAL_CALLDATA)).toBe(false);
        });
    });

    describe("optional field validation", () => {
        it("returns false when inputToken does not match", async () => {
            const wrongToken = await interopAddress(CHAIN_IDS.ETHEREUM, MAINNET_TOKENS.WETH);
            const intent = await createIntent({ inputAsset: wrongToken });

            expect(await validateAcrossPayload(intent, REAL_CALLDATA)).toBe(false);
        });

        it("returns false when inputAmount does not match", async () => {
            const intent = await createIntent({ inputAmount: "999" });

            expect(await validateAcrossPayload(intent, REAL_CALLDATA)).toBe(false);
        });

        it("returns true when inputAmount is undefined in intent", async () => {
            const intent = await createIntent();
            intent.intent.inputs = [
                {
                    user: intent.intent.inputs[0]?.user ?? "",
                    asset: intent.intent.inputs[0]?.asset ?? "",
                    amount: undefined,
                },
            ];

            expect(await validateAcrossPayload(intent, REAL_CALLDATA)).toBe(true);
        });
    });
});
