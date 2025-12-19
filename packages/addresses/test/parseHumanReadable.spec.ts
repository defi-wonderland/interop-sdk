import bs58 from "bs58";
import { getAddress, hexToBytes } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { InteropAddress } from "../src/internal.js";
import {
    ChecksumMismatchWarning,
    ENSLookupFailed,
    ENSNotFound,
    InvalidAddress,
    InvalidChainIdentifier,
    InvalidChainNamespace,
    InvalidChecksum,
    InvalidHumanReadableAddress,
    MissingHumanReadableAddress,
    parseHumanReadable,
} from "../src/internal.js";

const mockGetEnsAddress = vi.fn();
vi.mock("viem", async () => {
    const actual = await vi.importActual("viem");
    return {
        ...actual,
        createPublicClient: (): unknown => ({
            getEnsAddress: mockGetEnsAddress,
        }),
    };
});

describe("erc7930", () => {
    describe("parseHumanReadable", () => {
        beforeEach(() => {
            mockGetEnsAddress.mockClear();
        });

        describe("address conversion", () => {
            it("converts EVM mainnet address to interop address", async () => {
                const humanReadableAddress =
                    "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1#4CA88C9C";
                const expected: InteropAddress = {
                    version: 1,
                    chainType: hexToBytes("0x0000"),
                    chainReference: hexToBytes("0x01"),
                    address: hexToBytes("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"),
                };

                const interopAddress = await parseHumanReadable(humanReadableAddress);

                expect(interopAddress).toEqual(expected);
            });

            it("throws InvalidAddress for invalid EVM address", async () => {
                const humanReadableAddress = "0x1234@eip155:1#FFFFFFFF";

                await expect(parseHumanReadable(humanReadableAddress)).rejects.toThrow(
                    InvalidAddress,
                );
            });

            it("normalizes lowercase address to checksummed format", async () => {
                const lowercaseAddress = "0xd8da6bf26964af9d7eed9e03e53415d37aa96045";
                const checksummedAddress = getAddress(lowercaseAddress);
                // Test without checksum to focus on normalization behavior
                const humanReadableAddress = `${lowercaseAddress}@eip155:1`;
                const expected: InteropAddress = {
                    version: 1,
                    chainType: hexToBytes("0x0000"),
                    chainReference: hexToBytes("0x01"),
                    address: hexToBytes(checksummedAddress),
                };

                const interopAddress = await parseHumanReadable(humanReadableAddress, {
                    validateChecksumFlag: false,
                });

                expect(interopAddress).toEqual(expected);
            });

            it("normalizes mixed-case address to checksummed format", async () => {
                const mixedCaseAddress = "0xD8DA6BF26964AF9D7EED9E03E53415D37AA96045";
                const checksummedAddress = getAddress(mixedCaseAddress);
                // Test without checksum to focus on normalization behavior
                const humanReadableAddress = `${mixedCaseAddress}@eip155:1`;
                const expected: InteropAddress = {
                    version: 1,
                    chainType: hexToBytes("0x0000"),
                    chainReference: hexToBytes("0x01"),
                    address: hexToBytes(checksummedAddress),
                };

                const interopAddress = await parseHumanReadable(humanReadableAddress, {
                    validateChecksumFlag: false,
                });

                expect(interopAddress).toEqual(expected);
            });

            it("converts L2 address to interop address", async () => {
                const humanReadableAddress =
                    "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:8453#17DE0709";
                const expected: InteropAddress = {
                    version: 1,
                    chainType: hexToBytes("0x0000"),
                    chainReference: hexToBytes("0x2105"),
                    address: hexToBytes("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"),
                };

                const interopAddress = await parseHumanReadable(humanReadableAddress);

                expect(interopAddress).toEqual(expected);
            });

            it("converts solana address to interop address", async () => {
                const humanReadableAddress =
                    "MJKqp326RZCHnAAbew9MDdui3iCKWco7fsK9sVuZTX2@solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d#88835C11";
                const expected: InteropAddress = {
                    version: 1,
                    chainType: hexToBytes("0x0002"),
                    chainReference: hexToBytes(
                        "0x45296998a6f8e2a784db5d9f95e18fc23f70441a1039446801089879b08c7ef0",
                    ),
                    address: hexToBytes(
                        "0x05333498d5aea4ae009585c43f7b8c30df8e70187d4a713d134f977fc8dfe0b5",
                    ),
                };

                const interopAddress = await parseHumanReadable(humanReadableAddress);

                expect(interopAddress).toEqual(expected);
            });
        });

        describe("optional components", () => {
            it("parses address without account id", async () => {
                const humanReadableAddress = "@eip155:1#F54D4FBF";
                const expected: InteropAddress = {
                    version: 1,
                    chainType: hexToBytes("0x0000"),
                    chainReference: hexToBytes("0x01"),
                    address: new Uint8Array(),
                };
                await expect(parseHumanReadable(humanReadableAddress)).resolves.toEqual(expected);
            });

            it("parses address without chain reference", async () => {
                const humanReadableAddress =
                    "MJKqp326RZCHnAAbew9MDdui3iCKWco7fsK9sVuZTX2@solana:#18D1CBB4";
                const expected: InteropAddress = {
                    version: 1,
                    chainType: hexToBytes("0x0002"),
                    chainReference: new Uint8Array(),
                    address: bs58.decode("MJKqp326RZCHnAAbew9MDdui3iCKWco7fsK9sVuZTX2"),
                };
                const interopAddress = await parseHumanReadable(humanReadableAddress);

                expect(interopAddress).toEqual(expected);
            });

            it("parses address without chain reference and account id", async () => {
                const humanReadableAddress = "@solana:#F40BB840";
                const expected: InteropAddress = {
                    version: 1,
                    chainType: hexToBytes("0x0002"),
                    chainReference: new Uint8Array(),
                    address: new Uint8Array(),
                };
                const interopAddress = await parseHumanReadable(humanReadableAddress);

                expect(interopAddress).toEqual(expected);
            });
        });

        describe("ENS resolution", () => {
            it("converts ENS name to interop address", async () => {
                const humanReadableAddress = "vitalik.eth@eip155:1#4CA88C9C";
                const expected: InteropAddress = {
                    version: 1,
                    chainType: hexToBytes("0x0000"),
                    chainReference: hexToBytes("0x01"),
                    address: hexToBytes("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"),
                };

                mockGetEnsAddress.mockResolvedValue("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
                const interopAddress = await parseHumanReadable(humanReadableAddress);

                expect(interopAddress).toEqual(expected);
            });

            it("allows hyphens in ENS name", async () => {
                const humanReadableAddress = "ens-with-hyphens.eth@eip155:1#4CA88C9C";
                const expected: InteropAddress = {
                    version: 1,
                    chainType: hexToBytes("0x0000"),
                    chainReference: hexToBytes("0x01"),
                    address: hexToBytes("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"),
                };

                mockGetEnsAddress.mockResolvedValue("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
                const interopAddress = await parseHumanReadable(humanReadableAddress);

                expect(interopAddress).toEqual(expected);
            });

            it("throws ENSNotFound if ENS name not found", async () => {
                const humanReadableAddress = "notfoundensname.eth@eip155:1#4CA88C9C";
                mockGetEnsAddress.mockRejectedValue(new ENSNotFound(humanReadableAddress));
                await expect(parseHumanReadable(humanReadableAddress)).rejects.toThrow(ENSNotFound);
            });

            it("throws ENSLookupFailed if ENS lookup fails", async () => {
                const humanReadableAddress = "notfoundensname.eth@eip155:1#4CA88C9C";
                mockGetEnsAddress.mockRejectedValue(new ENSLookupFailed(humanReadableAddress));
                await expect(parseHumanReadable(humanReadableAddress)).rejects.toThrow(
                    ENSLookupFailed,
                );
            });

            it("throws if ENS name is used without chain reference", async () => {
                const humanReadableAddress = "vitalik.eth@eip155#4CA88C9C";
                await expect(parseHumanReadable(humanReadableAddress)).rejects.toThrow(
                    InvalidHumanReadableAddress,
                );
            });

            it("resolves ENS for non-viem EVM chains using mainnet coin type only", async () => {
                const humanReadableAddress = "vitalik.eth@eip155:9007199254740991";
                const expectedAddress = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
                const expected: InteropAddress = {
                    version: 1,
                    chainType: hexToBytes("0x0000"),
                    chainReference: hexToBytes("0x1FFFFFFFFFFFFF"), // 9007199254740991 in hex
                    address: hexToBytes(expectedAddress),
                };

                mockGetEnsAddress.mockResolvedValue(expectedAddress);

                const interopAddress = await parseHumanReadable(humanReadableAddress);

                expect(interopAddress).toEqual(expected);
                expect(mockGetEnsAddress).toHaveBeenCalledTimes(1);
                expect(mockGetEnsAddress).toHaveBeenCalledWith({
                    name: "vitalik.eth",
                    coinType: 60,
                });
            });

            it("falls back to mainnet ENS when chain-specific address not found", async () => {
                const humanReadableAddress = "vitalik.eth@eip155:8453";
                const expectedAddress = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
                const expected: InteropAddress = {
                    version: 1,
                    chainType: hexToBytes("0x0000"),
                    chainReference: hexToBytes("0x2105"), // Base chain ID (8453)
                    address: hexToBytes(expectedAddress),
                };

                mockGetEnsAddress
                    .mockResolvedValueOnce(null)
                    .mockResolvedValueOnce(expectedAddress);

                const interopAddress = await parseHumanReadable(humanReadableAddress);

                expect(interopAddress).toEqual(expected);
                expect(mockGetEnsAddress).toHaveBeenCalledTimes(2);

                expect(mockGetEnsAddress).toHaveBeenNthCalledWith(1, {
                    name: "vitalik.eth",
                    coinType: 0x80002105, // (0x80000000 | 8453) >>> 0
                });

                // Verify second call used Ethereum mainnet coin type
                expect(mockGetEnsAddress).toHaveBeenNthCalledWith(2, {
                    name: "vitalik.eth",
                    coinType: 60, // ETHEREUM_COIN_TYPE
                });
            });

            it("throws ENSNotFound when neither chain-specific nor mainnet address exists", async () => {
                const humanReadableAddress = "nonexistent.eth@eip155:8453";

                mockGetEnsAddress.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

                await expect(parseHumanReadable(humanReadableAddress)).rejects.toThrow(ENSNotFound);
                expect(mockGetEnsAddress).toHaveBeenCalledTimes(2);

                expect(mockGetEnsAddress).toHaveBeenNthCalledWith(1, {
                    name: "nonexistent.eth",
                    coinType: 0x80002105, // Base-specific
                });
                expect(mockGetEnsAddress).toHaveBeenNthCalledWith(2, {
                    name: "nonexistent.eth",
                    coinType: 60, // ETHEREUM_COIN_TYPE
                });
            });
        });

        describe("checksum validation", () => {
            it("allows missing checksum per ERC-7930/7828", async () => {
                const humanReadableAddress = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1";
                const expected: InteropAddress = {
                    version: 1,
                    chainType: hexToBytes("0x0000"),
                    chainReference: hexToBytes("0x01"),
                    address: hexToBytes("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"),
                };
                await expect(parseHumanReadable(humanReadableAddress)).resolves.toEqual(expected);
            });

            it("throws InvalidChecksum for raw address with wrong checksum", async () => {
                const humanReadableAddress =
                    "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1#FFFFFFFF";
                await expect(parseHumanReadable(humanReadableAddress)).rejects.toThrow(
                    InvalidChecksum,
                );
            });

            it("throws ChecksumMismatchWarning for ENS with wrong checksum", async () => {
                const humanReadableAddress = "vitalik.eth@eip155:1#FFFFFFFF";
                mockGetEnsAddress.mockResolvedValue("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");

                await expect(parseHumanReadable(humanReadableAddress)).rejects.toThrow(
                    ChecksumMismatchWarning,
                );
            });

            it("ChecksumMismatchWarning contains helpful message for ENS", async () => {
                const humanReadableAddress = "vitalik.eth@eip155:1#FFFFFFFF";
                mockGetEnsAddress.mockResolvedValue("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");

                try {
                    await parseHumanReadable(humanReadableAddress);
                    expect.fail("Should have thrown ChecksumMismatchWarning");
                } catch (error) {
                    expect(error).toBeInstanceOf(ChecksumMismatchWarning);
                    expect((error as Error).message).toContain("ENS");
                    expect((error as Error).message).toContain(
                        "resolve to different values over time",
                    );
                }
            });
        });

        describe("chain namespace handling", () => {
            it("defaults to eip155 if chain namespace is not provided", async () => {
                const humanReadableAddress =
                    "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@8453#17DE0709";
                const expected: InteropAddress = {
                    version: 1,
                    chainType: hexToBytes("0x0000"),
                    chainReference: hexToBytes("0x2105"),
                    address: hexToBytes("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"),
                };
                const interopAddress = await parseHumanReadable(humanReadableAddress);

                expect(interopAddress).toEqual(expected);
            });

            it("throws InvalidChainNamespace for invalid namespace", async () => {
                const humanReadableAddress =
                    "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@foo:1#17DE0709";
                await expect(parseHumanReadable(humanReadableAddress)).rejects.toThrow(
                    InvalidChainNamespace,
                );
            });

            it("throws InvalidChainIdentifier for non-numeric chain reference", async () => {
                const humanReadableAddress =
                    "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:not-a-number#4CA88C9C";
                await expect(parseHumanReadable(humanReadableAddress)).rejects.toThrow(
                    InvalidChainIdentifier,
                );
            });
        });

        describe("shortname support", () => {
            it("converts address with shortname to interop address", async () => {
                const humanReadableAddress =
                    "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eth#4CA88C9C";
                const expected: InteropAddress = {
                    version: 1,
                    chainType: hexToBytes("0x0000"),
                    chainReference: hexToBytes("0x01"),
                    address: hexToBytes("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"),
                };
                const interopAddress = await parseHumanReadable(humanReadableAddress);

                expect(interopAddress).toEqual(expected);
            });

            it("converts ENS with shortname to interop address", async () => {
                const humanReadableAddress = "vitalik.eth@eth#4CA88C9C";
                const expected: InteropAddress = {
                    version: 1,
                    chainType: hexToBytes("0x0000"),
                    chainReference: hexToBytes("0x01"),
                    address: hexToBytes("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"),
                };

                mockGetEnsAddress.mockResolvedValue("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
                const interopAddress = await parseHumanReadable(humanReadableAddress);

                expect(interopAddress).toEqual(expected);
            });

            it("throws InvalidChainIdentifier for invalid shortname", async () => {
                const humanReadableAddress = "vitalik.eth@foo#4CA88C9C";
                await expect(parseHumanReadable(humanReadableAddress)).rejects.toThrow(
                    InvalidChainIdentifier,
                );
            });
        });

        describe("error handling", () => {
            it("throws InvalidHumanReadableAddress for malformed address", async () => {
                const humanReadableAddress =
                    "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045:eip155:1#4CA88C9C";
                await expect(parseHumanReadable(humanReadableAddress)).rejects.toThrow(
                    InvalidHumanReadableAddress,
                );
            });

            it("throws MissingHumanReadableAddress for empty string", async () => {
                const humanReadableAddress = "";
                await expect(parseHumanReadable(humanReadableAddress)).rejects.toThrow(
                    MissingHumanReadableAddress,
                );
            });
        });
    });
});
