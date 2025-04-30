import { fromBytes, fromHex } from "viem";
import { describe, expect, it } from "vitest";

import { toBinary } from "../src/external.js";

describe("erc7930", () => {
    describe("toBinary", () => {
        it("convert interop address to binary", () => {
            const interopAddress = {
                version: 1,
                chainType: fromHex("0x0000", "bytes"),
                chainReference: fromHex("0x01", "bytes"),
                address: fromHex("0xd8da6bf26964af9d7eed9e03e53415d37aa96045", "bytes"),
            };

            const binaryAddress = fromBytes(toBinary(interopAddress), "hex");

            expect(binaryAddress).toEqual(
                "0x00010000010114d8da6bf26964af9d7eed9e03e53415d37aa96045",
            );

            /*    0x00010000010114D8DA6BF26964AF9D7EED9E03E53415D37AA96045
                    ^^^^-------------------------------------------------- Version:              decimal 1
                        ^^^^---------------------------------------------- ChainType:            2 bytes of CAIP namespace
                            ^^-------------------------------------------- ChainReferenceLength: decimal 1
                              ^^------------------------------------------ ChainReference:       1 byte to store uint8(1)
                                ^^---------------------------------------- AddressLength:        decimal 20
                                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Address:              20 bytes of ethereum address
      */
        });

        it("parse solana binary interop address", () => {
            const interopAddress = {
                version: 1,
                chainType: fromHex("0x0002", "bytes"),
                chainReference: fromHex(
                    "0x45296998a6f8e2a784db5d9f95e18fc23f70441a1039446801089879b08c7ef0",
                    "bytes",
                ),
                address: fromHex(
                    "0x05333498d5aea4ae009585c43f7b8c30df8e70187d4a713d134f977fc8dfe0b5",
                    "bytes",
                ),
            };

            const binaryAddress = fromBytes(toBinary(interopAddress), "hex");

            expect(binaryAddress).toEqual(
                "0x000100022045296998a6f8e2a784db5d9f95e18fc23f70441a1039446801089879b08c7ef02005333498d5aea4ae009585c43f7b8c30df8e70187d4a713d134f977fc8dfe0b5",
            );

            /*  0x000100022045296998a6f8e2a784db5d9f95e18fc23f70441a1039446801089879b08c7ef02005333498d5aea4ae009585c43f7b8c30df8e70187d4a713d134f977fc8dfe0b5
                  ^^^^---------------------------------------------------------------------------------------------------------------------------------------- Version:              decimal 1
                      ^^^^------------------------------------------------------------------------------------------------------------------------------------ ChainType:            2 bytes of CAIP namespace
                          ^^---------------------------------------------------------------------------------------------------------------------------------- ChainReferenceLength: decimal 32
                            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^------------------------------------------------------------------ ChainReference:       32 bytes of solana genesis block
                                                                                            ^^---------------------------------------------------------------- AddressLength:        decimal 32
                                                                                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^--- Address:              32 bytes of solana address
      */
        });

        it("parse evm without chain id binary interop address", () => {
            const interopAddress = {
                version: 1,
                chainType: fromHex("0x0000", "bytes"),
                chainReference: fromHex("0x", "bytes"),
                address: fromHex("0xd8da6bf26964af9d7eed9e03e53415d37aa96045", "bytes"),
            };
            const binaryAddress = fromBytes(toBinary(interopAddress), "hex");

            expect(binaryAddress).toEqual("0x000100000014d8da6bf26964af9d7eed9e03e53415d37aa96045");

            /*  0x000100000014D8DA6BF26964AF9D7EED9E03E53415D37AA96045
                  ^^^^------------------------------------------------ Version:              decimal 1
                      ^^^^-------------------------------------------- ChainType:            2 bytes of CAIP namespace
                          ^^------------------------------------------ ChainReferenceLength: zero, indicating no chainid
                            ^^---------------------------------------- AddressLength:        decimal 20
                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Address:              20 bytes of ethereum address
      */
        });

        it("parse solana binary interop address without address", () => {
            const interopAddress = {
                version: 1,
                chainType: fromHex("0x0002", "bytes"),
                chainReference: fromHex(
                    "0x45296998a6f8e2a784db5d9f95e18fc23f70441a1039446801089879b08c7ef0",
                    "bytes",
                ),
                address: fromHex("0x", "bytes"),
            };

            const binaryAddress = fromBytes(toBinary(interopAddress), "hex");

            expect(binaryAddress).toEqual(
                "0x000100022045296998a6f8e2a784db5d9f95e18fc23f70441a1039446801089879b08c7ef000",
            );

            /*  0x000100022045296998a6f8e2a784db5d9f95e18fc23f70441a1039446801089879b08c7ef000
                  ^^^^------------------------------------------------------------------------ Version:              decimal 1
                      ^^^^-------------------------------------------------------------------- ChainType:            2 bytes of CAIP namespace
                          ^^------------------------------------------------------------------ ChainReferenceLength: decimal 32
                            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^-- ChainReference:       32 bytes of solana genesis block
                                                                                            ^^ AddressLength:        zero, indicating no address
            */
        });
    });
});
