import { fromHex } from "viem";
import { describe, expect, it } from "vitest";

import type { InteroperableAddress } from "../../src/types/interopAddress.js";
import { encodeAddress } from "../../src/address/index.js";
import { InvalidInteroperableAddress } from "../../src/internal.js";

describe("erc7930", () => {
    describe("encodeAddress", () => {
        it("convert binary interop address to binary", () => {
            const interopAddress: InteroperableAddress = {
                version: 1,
                chainType: fromHex("0x0000", "bytes"),
                chainReference: fromHex("0x01", "bytes"),
                address: fromHex("0xd8da6bf26964af9d7eed9e03e53415d37aa96045", "bytes"),
            };

            const binaryAddress = encodeAddress(interopAddress, { format: "hex" });

            expect(binaryAddress).toEqual(
                "0x00010000010114d8da6bf26964af9d7eed9e03e53415d37aa96045",
            );

            /*    0x00010000010114D8DA6BF26964AF9D7EED9E03E53415D37AA96045
                    ^^^^-------------------------------------------------- Version:              decimal 1
                        ^^^^---------------------------------------------- ChainType:            2 bytes of chain type
                            ^^-------------------------------------------- ChainReferenceLength: decimal 1
                              ^^------------------------------------------ ChainReference:       1 byte to store uint8(1)
                                ^^---------------------------------------- AddressLength:        decimal 20
                                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Address:              20 bytes of ethereum address
      */
        });

        it("encode solana binary interop address", () => {
            const interopAddress: InteroperableAddress = {
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

            const binaryAddress = encodeAddress(interopAddress, { format: "hex" });

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

        it("encode evm without chain id binary interop address", () => {
            const interopAddress: InteroperableAddress = {
                version: 1,
                chainType: fromHex("0x0000", "bytes"),
                address: fromHex("0xd8da6bf26964af9d7eed9e03e53415d37aa96045", "bytes"),
            };
            const binaryAddress = encodeAddress(interopAddress, { format: "hex" });

            expect(binaryAddress).toEqual("0x000100000014d8da6bf26964af9d7eed9e03e53415d37aa96045");

            /*  0x000100000014D8DA6BF26964AF9D7EED9E03E53415D37AA96045
                  ^^^^------------------------------------------------ Version:              decimal 1
                      ^^^^-------------------------------------------- ChainType:            2 bytes of CAIP namespace
                          ^^------------------------------------------ ChainReferenceLength: zero, indicating no chainid
                            ^^---------------------------------------- AddressLength:        decimal 20
                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Address:              20 bytes of ethereum address
      */
        });

        it("encode solana binary interop address without address", () => {
            const interopAddress: InteroperableAddress = {
                version: 1,
                chainType: fromHex("0x0002", "bytes"),
                chainReference: fromHex(
                    "0x45296998a6f8e2a784db5d9f95e18fc23f70441a1039446801089879b08c7ef0",
                    "bytes",
                ),
            };

            const binaryAddress = encodeAddress(interopAddress, { format: "hex" });

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

        it("encode bip122 P2SH text representation", () => {
            const interopAddress: InteroperableAddress = {
                version: 1,
                chainType: "bip122",
                chainReference: "000000000019d6689c085ae165831e93",
                address: "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy",
            };

            const encoded = encodeAddress(interopAddress, { format: "hex" });
            const bytes = encodeAddress(interopAddress, { format: "bytes" });

            expect(encoded).toBeDefined();
            expect(bytes.length).toBeGreaterThan(6);
            // chainType bytes should be 0x0001
            expect(bytes[2]).toBe(0x00);
            expect(bytes[3]).toBe(0x01);
        });

        it("encode bip122 SegWit text representation", () => {
            const interopAddress: InteroperableAddress = {
                version: 1,
                chainType: "bip122",
                chainReference: "000000000019d6689c085ae165831e93",
                address: "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",
            };

            const bytes = encodeAddress(interopAddress, { format: "bytes" });
            expect(bytes.length).toBeGreaterThan(6);
            expect(bytes[2]).toBe(0x00);
            expect(bytes[3]).toBe(0x01);
        });

        it("encode bip122 Taproot text representation", () => {
            const interopAddress: InteroperableAddress = {
                version: 1,
                chainType: "bip122",
                chainReference: "000000000019d6689c085ae165831e93",
                address: "bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0",
            };

            const bytes = encodeAddress(interopAddress, { format: "bytes" });
            expect(bytes.length).toBeGreaterThan(6);
            expect(bytes[2]).toBe(0x00);
            expect(bytes[3]).toBe(0x01);
        });

        it("can encode text representation", () => {
            const interopAddress: InteroperableAddress = {
                version: 1,
                chainType: "eip155",
                chainReference: "1",
                address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
            };

            const binaryAddress = encodeAddress(interopAddress, { format: "hex" });

            expect(binaryAddress).toEqual(
                "0x00010000010114d8da6bf26964af9d7eed9e03e53415d37aa96045",
            );
        });

        it("throws if version is not there", () => {
            const interopAddress = {
                chainType: fromHex("0x0000", "bytes"),
                address: fromHex("0xd8da6bf26964af9d7eed9e03e53415d37aa96045", "bytes"),
            } as unknown as InteroperableAddress;

            expect(() => encodeAddress(interopAddress, { format: "hex" })).toThrow(
                InvalidInteroperableAddress,
            );
        });

        it("throws if chain type is not there", () => {
            const interopAddress = {
                version: 1,
                address: fromHex("0xd8da6bf26964af9d7eed9e03e53415d37aa96045", "bytes"),
            } as unknown as InteroperableAddress;

            expect(() => encodeAddress(interopAddress, { format: "hex" })).toThrow(
                InvalidInteroperableAddress,
            );
        });

        it("throws if chain type is not 2 bytes representable", () => {
            const interopAddress = {
                version: 1,
                chainType: fromHex("0x100000", "bytes"),
                address: fromHex("0xd8da6bf26964af9d7eed9e03e53415d37aa96045", "bytes"),
            } as unknown as InteroperableAddress;

            expect(() => encodeAddress(interopAddress, { format: "hex" })).toThrow(
                InvalidInteroperableAddress,
            );
        });

        it("does not throw if chain type is 2 bytes representable", () => {
            const interopAddress: InteroperableAddress = {
                version: 1,
                chainType: fromHex("0x0000000001", "bytes"),
                chainReference: fromHex("0x01", "bytes"),
                address: fromHex("0xd8da6bf26964af9d7eed9e03e53415d37aa96045", "bytes"),
            };

            const binaryAddress = encodeAddress(interopAddress, { format: "hex" });

            expect(binaryAddress).toEqual(
                "0x00010001010114d8da6bf26964af9d7eed9e03e53415d37aa96045",
            );
        });

        it("throws if both chain reference and address are missing", () => {
            const interopAddress = {
                version: 1,
                chainType: fromHex("0x0000", "bytes"),
            } as unknown as InteroperableAddress;

            expect(() => encodeAddress(interopAddress, { format: "hex" })).toThrow(
                InvalidInteroperableAddress,
            );
        });

        it("does not throw if chain reference is undefined (address present)", () => {
            const interopAddress: InteroperableAddress = {
                version: 1,
                chainType: fromHex("0x0000", "bytes"),
                address: fromHex("0xd8da6bf26964af9d7eed9e03e53415d37aa96045", "bytes"),
            };

            expect(() => encodeAddress(interopAddress, { format: "hex" })).not.toThrow(
                InvalidInteroperableAddress,
            );
        });

        it("does not throw if address is undefined (chain reference present)", () => {
            const interopAddress: InteroperableAddress = {
                version: 1,
                chainType: fromHex("0x0000", "bytes"),
                chainReference: fromHex("0x01", "bytes"),
            };

            expect(() => encodeAddress(interopAddress, { format: "hex" })).not.toThrow(
                InvalidInteroperableAddress,
            );
        });
    });
});
