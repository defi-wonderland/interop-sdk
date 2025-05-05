import { fromHex } from "viem";
import { describe, expect, it } from "vitest";

import { parseBinary } from "../src/external.js";
import { InvalidBinaryInteropAddress } from "../src/internal.js";

describe("erc7930", () => {
    describe("parseBinary", () => {
        it("parse ethereum binary interop address", () => {
            const binaryAddress = "0x00010000010114D8DA6BF26964AF9D7EED9E03E53415D37AA96045";
            /*    0x00010000010114D8DA6BF26964AF9D7EED9E03E53415D37AA96045
                    ^^^^-------------------------------------------------- Version:              decimal 1
                        ^^^^---------------------------------------------- ChainType:            2 bytes of CAIP namespace
                            ^^-------------------------------------------- ChainReferenceLength: decimal 1
                              ^^------------------------------------------ ChainReference:       1 byte to store uint8(1)
                                ^^---------------------------------------- AddressLength:        decimal 20
                                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Address:              20 bytes of ethereum address
            */

            const interopAddress = parseBinary(binaryAddress);

            expect(interopAddress.version).toEqual(1);
            expect(interopAddress.chainType).toEqual(fromHex("0x0000", "bytes"));
            expect(interopAddress.chainReference).toEqual(fromHex("0x01", "bytes"));
            expect(interopAddress.address).toEqual(
                fromHex("0xd8da6bf26964af9d7eed9e03e53415d37aa96045", "bytes"),
            );
        });

        it("parse solana binary interop address", () => {
            const binaryAddress =
                "0x000100022045296998a6f8e2a784db5d9f95e18fc23f70441a1039446801089879b08c7ef02005333498d5aea4ae009585c43f7b8c30df8e70187d4a713d134f977fc8dfe0b5";
            /*  0x000100022045296998a6f8e2a784db5d9f95e18fc23f70441a1039446801089879b08c7ef02005333498d5aea4ae009585c43f7b8c30df8e70187d4a713d134f977fc8dfe0b5
                  ^^^^---------------------------------------------------------------------------------------------------------------------------------------- Version:              decimal 1
                      ^^^^------------------------------------------------------------------------------------------------------------------------------------ ChainType:            2 bytes of CAIP namespace
                          ^^---------------------------------------------------------------------------------------------------------------------------------- ChainReferenceLength: decimal 32
                            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^------------------------------------------------------------------ ChainReference:       32 bytes of solana genesis block
                                                                                            ^^---------------------------------------------------------------- AddressLength:        decimal 32
                                                                                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^--- Address:              32 bytes of solana address
            */

            const interopAddress = parseBinary(binaryAddress);

            expect(interopAddress.version).toEqual(1);
            expect(interopAddress.chainType).toEqual(fromHex("0x0002", "bytes"));
            expect(interopAddress.chainReference).toEqual(
                fromHex(
                    "0x45296998a6f8e2a784db5d9f95e18fc23f70441a1039446801089879b08c7ef0",
                    "bytes",
                ),
            );
            expect(interopAddress.address).toEqual(
                fromHex(
                    "0x05333498d5aea4ae009585c43f7b8c30df8e70187d4a713d134f977fc8dfe0b5",
                    "bytes",
                ),
            );
        });

        it("parse evm without chain id binary interop address", () => {
            const binaryAddress = "0x000100000014D8DA6BF26964AF9D7EED9E03E53415D37AA96045";
            /*  0x000100000014D8DA6BF26964AF9D7EED9E03E53415D37AA96045
                  ^^^^------------------------------------------------ Version:              decimal 1
                      ^^^^-------------------------------------------- ChainType:            2 bytes of CAIP namespace
                          ^^------------------------------------------ ChainReferenceLength: zero, indicating no chainid
                            ^^---------------------------------------- AddressLength:        decimal 20
                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Address:              20 bytes of ethereum address
            */

            const interopAddress = parseBinary(binaryAddress);

            expect(interopAddress.version).toEqual(1);
            expect(interopAddress.chainType).toEqual(fromHex("0x0000", "bytes"));
            expect(interopAddress.chainReference).toHaveLength(0);
            expect(interopAddress.address).toEqual(
                fromHex("0xd8da6bf26964af9d7eed9e03e53415d37aa96045", "bytes"),
            );
        });

        it("parse solana binary interop address without address", () => {
            const binaryAddress =
                "0x000100022045296998a6f8e2a784db5d9f95e18fc23f70441a1039446801089879b08c7ef000";
            /*  0x000100022045296998a6f8e2a784db5d9f95e18fc23f70441a1039446801089879b08c7ef000
                  ^^^^------------------------------------------------------------------------ Version:              decimal 1
                      ^^^^-------------------------------------------------------------------- ChainType:            2 bytes of CAIP namespace
                          ^^------------------------------------------------------------------ ChainReferenceLength: decimal 32
                            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^-- ChainReference:       32 bytes of solana genesis block
                                                                                            ^^ AddressLength:        zero, indicating no address
            */

            const interopAddress = parseBinary(binaryAddress);

            expect(interopAddress.version).toEqual(1);
            expect(interopAddress.chainType).toEqual(fromHex("0x0002", "bytes"));
            expect(interopAddress.chainReference).toEqual(
                fromHex(
                    "0x45296998a6f8e2a784db5d9f95e18fc23f70441a1039446801089879b08c7ef0",
                    "bytes",
                ),
            );
            expect(interopAddress.address).toHaveLength(0);
        });

        it("throws if version is not there", () => {
            const binaryAddress = "0x";

            expect(() => parseBinary(binaryAddress)).toThrow(
                new InvalidBinaryInteropAddress("Invalid version length, expected: 2, got: 0"),
            );
        });

        it("throws if version has length less than 2 bytes", () => {
            const binaryAddress = "0x01";

            expect(() => parseBinary(binaryAddress)).toThrow(
                new InvalidBinaryInteropAddress("Invalid version length, expected: 2, got: 1"),
            );
        });

        it("throws if chain type is not there", () => {
            const binaryAddress = "0x0001";

            expect(() => parseBinary(binaryAddress)).toThrow(
                new InvalidBinaryInteropAddress("Invalid chain type length, expected: 2, got: 0"),
            );
        });

        it("throws if chain type has length less than 1 bytes", () => {
            const binaryAddress = "0x00011";

            expect(() => parseBinary(binaryAddress)).toThrow(
                new InvalidBinaryInteropAddress("Invalid chain type length, expected: 2, got: 1"),
            );
        });

        it("throws if chain reference length is not there", () => {
            const binaryAddress = "0x00010000";

            expect(() => parseBinary(binaryAddress)).toThrow(
                new InvalidBinaryInteropAddress(
                    "Invalid chain reference length, expected: 1, got: 0",
                ),
            );
        });

        it("throws if chain reference is not what chain type length indicates", () => {
            const binaryAddress = "0x000100000201";

            expect(() => parseBinary(binaryAddress)).toThrow(
                new InvalidBinaryInteropAddress(
                    "Invalid chain reference length, expected: 2, got: 1",
                ),
            );
        });

        it("throws if address length is not there", () => {
            const binaryAddress = "0x00010000020100";

            expect(() => parseBinary(binaryAddress)).toThrow(
                new InvalidBinaryInteropAddress("Invalid address length, expected: 1, got: 0"),
            );
        });

        it("throws if address is not what address length indicates", () => {
            const binaryAddress = "0x000100000201000200";

            expect(() => parseBinary(binaryAddress)).toThrow(
                new InvalidBinaryInteropAddress("Invalid address length, expected: 2, got: 1"),
            );
        });
    });
});
