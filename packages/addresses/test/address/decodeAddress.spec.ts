import { fromHex } from "viem";
import { describe, expect, it } from "vitest";

import type { InteroperableAddress } from "../../src/types/interopAddress.js";
import { decodeAddress, encodeAddress } from "../../src/address/index.js";
import { InvalidBinaryInteropAddress } from "../../src/internal.js";
import { isTextAddress } from "../../src/types/interopAddress.js";

describe("erc7930", () => {
    describe("decodeAddress", () => {
        it("parse ethereum binary interop address", () => {
            const binaryAddress = "0x00010000010114D8DA6BF26964AF9D7EED9E03E53415D37AA96045";
            /*    0x00010000010114D8DA6BF26964AF9D7EED9E03E53415D37AA96045
                    ^^^^-------------------------------------------------- Version:              decimal 1
                        ^^^^---------------------------------------------- ChainType:            2 bytes of chain type
                            ^^-------------------------------------------- ChainReferenceLength: decimal 1
                              ^^------------------------------------------ ChainReference:       1 byte to store uint8(1)
                                ^^---------------------------------------- AddressLength:        decimal 20
                                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Address:              20 bytes of ethereum address
            */

            const interopAddress = decodeAddress(binaryAddress);

            expect(interopAddress.version).toEqual(1);
            expect(isTextAddress(interopAddress)).toBe(true);
            if (isTextAddress(interopAddress)) {
                expect(interopAddress.chainType).toEqual("eip155");
                expect(interopAddress.chainReference).toEqual("1");
                expect(interopAddress.address).toEqual(
                    "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
                );
            }
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

            const interopAddress = decodeAddress(binaryAddress);

            expect(interopAddress.version).toEqual(1);
            expect(isTextAddress(interopAddress)).toBe(true);
            if (isTextAddress(interopAddress)) {
                expect(interopAddress.chainType).toEqual("solana");
                expect(interopAddress.chainReference).toEqual(
                    "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d",
                );
                expect(interopAddress.address).toEqual(
                    "MJKqp326RZCHnAAbew9MDdui3iCKWco7fsK9sVuZTX2",
                );
            }
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

            const interopAddress = decodeAddress(binaryAddress);

            expect(interopAddress.version).toEqual(1);
            expect(isTextAddress(interopAddress)).toBe(true);
            if (isTextAddress(interopAddress)) {
                expect(interopAddress.chainType).toEqual("eip155");
                expect(interopAddress.chainReference).toBeUndefined();
                expect(interopAddress.address).toEqual(
                    "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
                );
            }
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

            const interopAddress = decodeAddress(binaryAddress);

            expect(interopAddress.version).toEqual(1);
            expect(isTextAddress(interopAddress)).toBe(true);
            if (isTextAddress(interopAddress)) {
                expect(interopAddress.chainType).toEqual("solana");
                expect(interopAddress.chainReference).toEqual(
                    "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d",
                );
                expect(interopAddress.address).toBeUndefined();
            }
        });

        it("parse bip122 P2SH binary interop address", () => {
            const binaryAddress =
                "0x0001000110000000000019d6689c085ae165831e93160105b472a266d0bd89c13706a4132ccfb16f7c3b9fcb";
            /*    0x0001000110000000000019d6689c085ae165831e93160105b472a266d0bd89c13706a4132ccfb16f7c3b9fcb
                    ^^^^-------------------------------------------------------------------------------------- Version:              decimal 1
                        ^^^^---------------------------------------------------------------------------------- ChainType:            0x0001 (bip122)
                            ^^-------------------------------------------------------------------------------- ChainReferenceLength: decimal 16 (0x10)
                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^------------------------------------------------ ChainReference:       16 bytes of Bitcoin mainnet genesis hash prefix
                                                              ^^---------------------------------------------- AddressLength:        decimal 22 (0x16)
                                                                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^--- Address:              0x01 (base58check) + 21-byte payload
            */

            const interopAddress = decodeAddress(binaryAddress);

            expect(interopAddress.version).toEqual(1);
            expect(isTextAddress(interopAddress)).toBe(true);
            if (isTextAddress(interopAddress)) {
                expect(interopAddress.chainType).toEqual("bip122");
                expect(interopAddress.chainReference).toEqual("000000000019d6689c085ae165831e93");
                expect(interopAddress.address).toEqual("3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy");
            }
        });

        it("parse bip122 SegWit binary interop address", () => {
            const binaryAddress =
                "0x0001000110000000000019d6689c085ae165831e93160200751e76e8199196d454941c45d1b3a323f1433bd6";

            const interopAddress = decodeAddress(binaryAddress);

            expect(interopAddress.version).toEqual(1);
            expect(isTextAddress(interopAddress)).toBe(true);
            if (isTextAddress(interopAddress)) {
                expect(interopAddress.chainType).toEqual("bip122");
                expect(interopAddress.chainReference).toEqual("000000000019d6689c085ae165831e93");
                expect(interopAddress.address).toEqual(
                    "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",
                );
            }
        });

        it("parse bip122 Taproot binary interop address", () => {
            const binaryAddress =
                "0x0001000110000000000019d6689c085ae165831e9322020179be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798";

            const interopAddress = decodeAddress(binaryAddress);

            expect(interopAddress.version).toEqual(1);
            expect(isTextAddress(interopAddress)).toBe(true);
            if (isTextAddress(interopAddress)) {
                expect(interopAddress.chainType).toEqual("bip122");
                expect(interopAddress.chainReference).toEqual("000000000019d6689c085ae165831e93");
                expect(interopAddress.address).toEqual(
                    "bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0",
                );
            }
        });

        it("parse starknet binary interop address", () => {
            const binaryAddress =
                "0x0001000307534e5f4d41494e2002dd1b492765c064eac4039e3841aa5f382773b598097a40073bd8b48170ab57";
            /*  0x0001000307534e5f4d41494e2002dd1b492765c064eac4039e3841aa5f382773b598097a40073bd8b48170ab57
                  ^^^^-------------------------------------------------------------------------------------- Version:              decimal 1
                      ^^^^---------------------------------------------------------------------------------- ChainType:            0x0003 (starknet)
                          ^^-------------------------------------------------------------------------------- ChainReferenceLength: decimal 7
                            ^^^^^^^^^^^^^^------------------------------------------------------------------ ChainReference:       7 bytes UTF-8 "SN_MAIN"
                                          ^^---------------------------------------------------------------- AddressLength:        decimal 32 (0x20)
                                            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Address:              32 bytes felt252
            */

            const interopAddress = decodeAddress(binaryAddress);

            expect(interopAddress.version).toEqual(1);
            expect(isTextAddress(interopAddress)).toBe(true);
            if (isTextAddress(interopAddress)) {
                expect(interopAddress.chainType).toEqual("starknet");
                expect(interopAddress.chainReference).toEqual("SN_MAIN");
                expect(interopAddress.address).toEqual(
                    "0x02dd1b492765c064eac4039e3841aa5f382773b598097a40073bd8b48170ab57",
                );
            }
        });

        it("roundtrip starknet encode then decode", () => {
            const original: InteroperableAddress = {
                version: 1,
                chainType: "starknet",
                chainReference: "SN_MAIN",
                address: "0x02dd1b492765c064eac4039e3841aa5f382773b598097a40073bd8b48170ab57",
            };

            const encoded = encodeAddress(original, { format: "hex" });
            const decoded = decodeAddress(encoded);

            expect(isTextAddress(decoded)).toBe(true);
            if (isTextAddress(decoded)) {
                expect(decoded.chainType).toEqual("starknet");
                expect(decoded.chainReference).toEqual("SN_MAIN");
                expect(decoded.address).toEqual(original.address);
            }
        });

        it("throws if version is not there", () => {
            const binaryAddress = "0x"; // 0 bytes, minimum is 6

            expect(() => decodeAddress(binaryAddress)).toThrow(
                new InvalidBinaryInteropAddress(
                    "Invalid binary address length: expected at least 6 bytes, got 0",
                ),
            );
        });

        it("throws if version has length less than 2 bytes", () => {
            const binaryAddress = "0x01"; // 1 byte, minimum is 6

            expect(() => decodeAddress(binaryAddress)).toThrow(
                new InvalidBinaryInteropAddress(
                    "Invalid binary address length: expected at least 6 bytes, got 1",
                ),
            );
        });

        it("throws if chain type is not there", () => {
            const binaryAddress = "0x0001"; // 2 bytes, minimum is 6

            expect(() => decodeAddress(binaryAddress)).toThrow(
                new InvalidBinaryInteropAddress(
                    "Invalid binary address length: expected at least 6 bytes, got 2",
                ),
            );
        });

        it("throws if chain type has length less than 1 bytes", () => {
            const binaryAddress = "0x00011"; // 3 bytes, minimum is 6

            expect(() => decodeAddress(binaryAddress)).toThrow(
                new InvalidBinaryInteropAddress(
                    "Invalid binary address length: expected at least 6 bytes, got 3",
                ),
            );
        });

        it("throws if chain reference length is not there", () => {
            const binaryAddress = "0x00010000"; // 4 bytes, minimum is 6

            expect(() => decodeAddress(binaryAddress)).toThrow(
                new InvalidBinaryInteropAddress(
                    "Invalid binary address length: expected at least 6 bytes, got 4",
                ),
            );
        });

        it("throws if chain reference is not what chain type length indicates", () => {
            const binaryAddress = "0x000100000201"; // 6 bytes: version(2) + chainType(2) + chainRefLen(1=2) + chainRef(1) but needs 2

            expect(() => decodeAddress(binaryAddress)).toThrow(
                new InvalidBinaryInteropAddress(
                    "Invalid chain reference length, expected: 2, got: 1",
                ),
            );
        });

        it("throws if address length field is missing", () => {
            const binaryAddress = "0x00010000020100"; // 7 bytes: version(2) + chainType(2) + chainRefLen(1) + chainRef(2) = 7, missing addressLen

            expect(() => decodeAddress(binaryAddress)).toThrow(
                new InvalidBinaryInteropAddress("Invalid address length, expected: 1, got: 0"),
            );
        });

        it("throws if address is not what address length indicates", () => {
            const binaryAddress = "0x000100000201000200"; // 9 bytes: version(2) + chainType(2) + chainRefLen(1) + chainRef(2) + addrLen(1=2) + addr(1) but needs 2

            expect(() => decodeAddress(binaryAddress)).toThrow(
                new InvalidBinaryInteropAddress("Invalid address length, expected: 2, got: 1"),
            );
        });

        it("throws if version is not 1", () => {
            const binaryAddress = "0x00020000010114D8DA6BF26964AF9D7EED9E03E53415D37AA96045"; // version 2

            expect(() => decodeAddress(binaryAddress)).toThrow(
                new InvalidBinaryInteropAddress("Unsupported version: expected 1, got 2"),
            );
        });

        it("throws if chain reference length exceeds 32 bytes", () => {
            // Create an address with chainReferenceLength = 33 (0x21)
            const binaryAddress = ("0x0001000021" +
                "00".repeat(33) +
                "00" +
                "00".repeat(20)) as `0x${string}`;

            expect(() => decodeAddress(binaryAddress)).toThrow(
                new InvalidBinaryInteropAddress(
                    "Invalid chain reference length: expected <= 32 bytes, got 33",
                ),
            );
        });

        it("accepts maximum valid address length (255 bytes) in binary representation", () => {
            // Test that the maximum valid address length (255 bytes) works
            // addressLength is 1 byte, so max is 255 (0xFF)
            // Use binary representation to avoid text conversion validation issues
            const chainRef = "00"; // 1 byte chain ref
            const addressData = "00".repeat(255); // 255 bytes of address data
            const binaryAddress = ("0x0001000001" + chainRef + "ff" + addressData) as `0x${string}`; // version(2) + chainType(2) + chainRefLen(1=1) + chainRef(1) + addrLen(1=255) + addr(255)

            // Should succeed - 255 is the maximum valid length
            const result = decodeAddress(binaryAddress, { representation: "binary" });
            expect(result.version).toBe(1);
            if (result.chainType instanceof Uint8Array) {
                expect(result.address?.length).toBe(255);
            }
            // Note: The validation check for addressLength > 255 is defensive but can't be tested
            // since addressLength is a 1-byte field (max 255)
        });

        it("throws if both chain reference and address are empty", () => {
            // Create an address with both chainReferenceLength = 0 and addressLength = 0
            const binaryAddress = "0x000100000000"; // version(2) + chainType(2) + chainRefLen(1=0) + addrLen(1=0)

            expect(() => decodeAddress(binaryAddress)).toThrow(
                new InvalidBinaryInteropAddress(
                    "At least one of chainReference or address must be provided",
                ),
            );
        });

        it("can decode to binary representation", () => {
            const binaryAddress = "0x00010000010114D8DA6BF26964AF9D7EED9E03E53415D37AA96045";
            const interopAddress = decodeAddress(binaryAddress, { representation: "binary" });

            expect(interopAddress.version).toEqual(1);
            expect(interopAddress.chainType instanceof Uint8Array).toBe(true);
            if (interopAddress.chainType instanceof Uint8Array) {
                expect(interopAddress.chainType).toEqual(fromHex("0x0000", "bytes"));
                expect(interopAddress.chainReference).toEqual(fromHex("0x01", "bytes"));
                expect(interopAddress.address).toEqual(
                    fromHex("0xd8da6bf26964af9d7eed9e03e53415d37aa96045", "bytes"),
                );
            }
        });
    });
});
