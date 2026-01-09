import { fromHex } from "viem";
import { describe, expect, it } from "vitest";

import type { InteroperableAddress } from "../../src/types/interopAddress.js";
import { validateInteroperableAddress } from "../../src/address/index.js";
import { InvalidInteroperableAddress } from "../../src/internal.js";

describe("validateInteroperableAddress", () => {
    it("validates a valid EVM address (binary representation)", () => {
        const interopAddress: InteroperableAddress = {
            version: 1,
            chainType: fromHex("0x0000", "bytes"),
            chainReference: fromHex("0x01", "bytes"),
            address: fromHex("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "bytes"),
        };

        const validated = validateInteroperableAddress(interopAddress);

        expect(validated).toEqual(interopAddress);
    });

    it("validates a valid EVM address (text representation)", () => {
        const interopAddress: InteroperableAddress = {
            version: 1,
            chainType: "eip155",
            chainReference: "1",
            address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
        };

        const validated = validateInteroperableAddress(interopAddress);

        expect(validated).toEqual(interopAddress);
    });

    it("validates a valid Solana address (binary representation)", () => {
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

        const validated = validateInteroperableAddress(interopAddress);

        expect(validated).toEqual(interopAddress);
    });

    it("normalizes chainType by padding to 2 bytes", () => {
        const interopAddress: InteroperableAddress = {
            version: 1,
            chainType: fromHex("0x00", "bytes"), // 1 byte, should be padded to 2
            chainReference: fromHex("0x01", "bytes"),
            address: fromHex("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "bytes"),
        };

        const validated = validateInteroperableAddress(interopAddress);

        if (validated.chainType instanceof Uint8Array) {
            expect(validated.chainType).toHaveLength(2);
            expect(validated.chainType).toEqual(fromHex("0x0000", "bytes"));
        }
    });

    it("normalizes chainType by trimming excess bytes", () => {
        const interopAddress: InteroperableAddress = {
            version: 1,
            chainType: fromHex("0x00000000", "bytes"), // 4 bytes, should be trimmed to 2
            chainReference: fromHex("0x01", "bytes"),
            address: fromHex("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "bytes"),
        };

        const validated = validateInteroperableAddress(interopAddress);

        if (validated.chainType instanceof Uint8Array) {
            expect(validated.chainType).toHaveLength(2);
            expect(validated.chainType).toEqual(fromHex("0x0000", "bytes"));
        }
    });

    it("validates address with empty chain reference (text representation)", () => {
        const interopAddress: InteroperableAddress = {
            version: 1,
            chainType: "eip155",
            address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
        };

        const validated = validateInteroperableAddress(interopAddress);

        if (typeof validated.chainType === "string") {
            expect(validated.chainReference).toBeUndefined();
        }
    });

    it("validates address with empty address field (text representation)", () => {
        const interopAddress: InteroperableAddress = {
            version: 1,
            chainType: "eip155",
            chainReference: "1",
        };

        const validated = validateInteroperableAddress(interopAddress);

        if (typeof validated.chainType === "string") {
            expect(validated.address).toBeUndefined();
        }
    });

    it("throws InvalidInteroperableAddress for invalid version", () => {
        const interopAddress = {
            version: 0, // Invalid: must be positive
            chainType: fromHex("0x0000", "bytes"),
            chainReference: fromHex("0x01", "bytes"),
            address: fromHex("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "bytes"),
        } as InteroperableAddress;

        expect(() => validateInteroperableAddress(interopAddress)).toThrow(
            InvalidInteroperableAddress,
        );
    });

    it("throws InvalidInteroperableAddress for chainType that cannot be normalized to 2 bytes", () => {
        // Create a Uint8Array with more than 2 bytes (after trimming)
        // Use non-zero bytes so trim doesn't make it empty
        const largeChainType = new Uint8Array(33); // 33 bytes > 2 bytes
        largeChainType.fill(1); // Fill with 1s so trim doesn't remove them
        const interopAddress = {
            version: 1,
            chainType: largeChainType, // Too large - refine should catch this (trim(value).length = 33 > 2)
            chainReference: fromHex("0x01", "bytes"),
            address: fromHex("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "bytes"),
        } as InteroperableAddress;

        expect(() => validateInteroperableAddress(interopAddress)).toThrow(
            InvalidInteroperableAddress,
        );
    });

    describe("chain-type-specific validation for text representation", () => {
        it("validates eip155 address format", () => {
            const invalidAddress = {
                version: 1,
                chainType: "eip155" as const,
                chainReference: "1",
                address: "not-a-valid-address",
            };

            expect(() => validateInteroperableAddress(invalidAddress)).toThrow(
                InvalidInteroperableAddress,
            );
            try {
                validateInteroperableAddress(invalidAddress);
                expect.fail("Should have thrown");
            } catch (error) {
                expect(error).toBeInstanceOf(InvalidInteroperableAddress);
                if (error instanceof InvalidInteroperableAddress) {
                    const message = error.zodError.issues[0]?.message || error.message;
                    expect(message).toContain('Invalid address for chain type "eip155"');
                }
            }
        });

        it("validates solana address format", () => {
            const invalidAddress = {
                version: 1,
                chainType: "solana" as const,
                chainReference: "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d",
                address: "not-a-valid-base58-address",
            };

            expect(() => validateInteroperableAddress(invalidAddress)).toThrow(
                InvalidInteroperableAddress,
            );
            try {
                validateInteroperableAddress(invalidAddress);
                expect.fail("Should have thrown");
            } catch (error) {
                expect(error).toBeInstanceOf(InvalidInteroperableAddress);
                if (error instanceof InvalidInteroperableAddress) {
                    const message = error.zodError.issues[0]?.message || error.message;
                    expect(message).toContain('Invalid address for chain type "solana"');
                }
            }
        });

        it("validates eip155 chain reference format", () => {
            const invalidAddress = {
                version: 1,
                chainType: "eip155" as const,
                chainReference: "not-a-number",
                address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
            };

            expect(() => validateInteroperableAddress(invalidAddress)).toThrow(
                InvalidInteroperableAddress,
            );
            try {
                validateInteroperableAddress(invalidAddress);
                expect.fail("Should have thrown");
            } catch (error) {
                expect(error).toBeInstanceOf(InvalidInteroperableAddress);
                if (error instanceof InvalidInteroperableAddress) {
                    const message = error.zodError.issues[0]?.message || error.message;
                    expect(message).toContain('Invalid chain reference for chain type "eip155"');
                }
            }
        });

        it("validates eip155 chain reference is positive", () => {
            const invalidAddress = {
                version: 1,
                chainType: "eip155" as const,
                chainReference: "0",
                address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
            };

            expect(() => validateInteroperableAddress(invalidAddress)).toThrow(
                InvalidInteroperableAddress,
            );
            try {
                validateInteroperableAddress(invalidAddress);
                expect.fail("Should have thrown");
            } catch (error) {
                expect(error).toBeInstanceOf(InvalidInteroperableAddress);
                if (error instanceof InvalidInteroperableAddress) {
                    const message = error.zodError.issues[0]?.message || error.message;
                    expect(message).toContain('Invalid chain reference for chain type "eip155"');
                }
            }
        });

        it("validates solana chain reference format", () => {
            const invalidAddress = {
                version: 1,
                chainType: "solana" as const,
                chainReference: "not-a-valid-base58-string",
                address: "11111111111111111111111111111111",
            };

            expect(() => validateInteroperableAddress(invalidAddress)).toThrow(
                InvalidInteroperableAddress,
            );
            try {
                validateInteroperableAddress(invalidAddress);
                expect.fail("Should have thrown");
            } catch (error) {
                expect(error).toBeInstanceOf(InvalidInteroperableAddress);
                if (error instanceof InvalidInteroperableAddress) {
                    const message = error.zodError.issues[0]?.message || error.message;
                    expect(message).toContain('Invalid chain reference for chain type "solana"');
                }
            }
        });

        it("accepts valid eip155 address and chain reference", () => {
            const validAddress = {
                version: 1,
                chainType: "eip155" as const,
                chainReference: "1",
                address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
            };

            expect(() => validateInteroperableAddress(validAddress)).not.toThrow();
            const result = validateInteroperableAddress(validAddress);
            expect(result).toEqual(validAddress);
        });

        it("accepts valid solana address and chain reference", () => {
            const validAddress = {
                version: 1,
                chainType: "solana" as const,
                chainReference: "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d",
                address: "11111111111111111111111111111111",
            };

            expect(() => validateInteroperableAddress(validAddress)).not.toThrow();
            const result = validateInteroperableAddress(validAddress);
            expect(result).toEqual(validAddress);
        });
    });
});
