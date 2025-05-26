import { BinaryAddress, HumanReadableAddress, InteropAddress } from "@interop-sdk/addresses";
import { hexToBytes } from "viem";
import { describe, expect, it } from "vitest";

import { InteropAddressParamsParser } from "../../src/services/InteropAddressParamsParser.js";

describe("InteropAddressParamsParser", () => {
    describe("parseGetQuoteParams", () => {
        it("parse human readable transfer params", async () => {
            const paramsParser = new InteropAddressParamsParser();
            const params = await paramsParser.parseGetQuoteParams("crossChainTransfer", {
                sender: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:11155111#3B518BB3" as HumanReadableAddress,
                recipient:
                    "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:11155111#3B518BB3" as HumanReadableAddress,
                amount: "1000000000000000000",
                inputTokenAddress: "0x0000000000000000000000000000000000000000",
                outputTokenAddress: "0x0000000000000000000000000000000000000000",
            });

            expect(params).toEqual({
                inputTokenAddress: "0x0000000000000000000000000000000000000000",
                outputTokenAddress: "0x0000000000000000000000000000000000000000",
                inputAmount: "1000000000000000000",
                inputChainId: 11155111,
                outputChainId: 11155111,
                sender: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
                recipient: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
            });
        });

        it("parse binary transfer params", async () => {
            const paramsParser = new InteropAddressParamsParser();
            const params = await paramsParser.parseGetQuoteParams("crossChainTransfer", {
                sender: "0x0001000003aa36a714d8da6bf26964af9d7eed9e03e53415d37aa96045" as BinaryAddress,
                recipient:
                    "0x0001000003aa36a714d8da6bf26964af9d7eed9e03e53415d37aa96045" as BinaryAddress,
                amount: "1000000000000000000",
                inputTokenAddress: "0x0000000000000000000000000000000000000000",
                outputTokenAddress: "0x0000000000000000000000000000000000000000",
            });

            expect(params).toEqual({
                inputTokenAddress: "0x0000000000000000000000000000000000000000",
                outputTokenAddress: "0x0000000000000000000000000000000000000000",
                inputAmount: "1000000000000000000",
                inputChainId: 11155111,
                outputChainId: 11155111,
                sender: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
                recipient: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
            });
        });

        it("parse raw address transfer params", async () => {
            const paramsParser = new InteropAddressParamsParser();
            const params = await paramsParser.parseGetQuoteParams("crossChainTransfer", {
                sender: {
                    address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
                    chainId: 11155111,
                },
                recipient: {
                    address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
                    chainId: 11155111,
                },
                amount: "1000000000000000000",
                inputTokenAddress: "0x0000000000000000000000000000000000000000",
                outputTokenAddress: "0x0000000000000000000000000000000000000000",
            });

            expect(params).toEqual({
                inputTokenAddress: "0x0000000000000000000000000000000000000000",
                outputTokenAddress: "0x0000000000000000000000000000000000000000",
                inputAmount: "1000000000000000000",
                inputChainId: 11155111,
                outputChainId: 11155111,
                sender: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
                recipient: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
            });
        });

        it("fails if chain id is not supported", async () => {
            const paramsParser = new InteropAddressParamsParser();
            await expect(
                paramsParser.parseGetQuoteParams("crossChainTransfer", {
                    sender: {
                        address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
                        chainId: 11155112,
                    },
                    recipient: {
                        address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
                        chainId: 11155111,
                    },
                    amount: "1000000000000000000",
                    inputTokenAddress: "0x0000000000000000000000000000000000000000",
                    outputTokenAddress: "0x0000000000000000000000000000000000000000",
                }),
            ).rejects.toThrow();
        });
    });
});
