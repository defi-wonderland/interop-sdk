import { describe, expect, it, vi } from "vitest";

import {
    binaryToHumanReadable,
    buildFromPayload,
    computeChecksum,
    humanReadableToBinary,
    InteropAddressProvider,
    isValidBinaryAddress,
    isValidHumanReadableAddress,
    isValidInteropAddress,
} from "../src/providers/InteropAddressProvider.js";
import { BinaryAddress, HumanReadableAddress } from "../src/types/index.js";

const mockGetEnsAddress = vi.fn();
const mockGetEnsName = vi.fn();
vi.mock("viem", async () => {
    const actual = await vi.importActual("viem");
    return {
        ...actual,
        createPublicClient: (): unknown => ({
            getEnsAddress: mockGetEnsAddress,
            getEnsName: mockGetEnsName,
        }),
    };
});

describe("InteropAddressProvider", () => {
    it("convert a human-readable address to a binary address", async () => {
        const binaryAddress = await InteropAddressProvider.humanReadableToBinary(
            "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1#4CA88C9C" as HumanReadableAddress,
        );
        expect(binaryAddress).toBe("0x00010000010114d8da6bf26964af9d7eed9e03e53415d37aa96045");
    });

    // FIXME: use ERC-7828 to reverse resolution of ENS addresses
    it.skip("convert a binary address to a human-readable address", async () => {
        mockGetEnsName.mockResolvedValue("vitalik.eth");
        const humanReadableAddress = await InteropAddressProvider.binaryToHumanReadable(
            "0x00010000010114d8da6bf26964af9d7eed9e03e53415d37aa96045" as BinaryAddress,
        );
        expect(humanReadableAddress).toBe("vitalik.eth@eip155:1#4CA88C9C");
    });

    it("computes the checksum of a human-readable address", async () => {
        const checksum = await InteropAddressProvider.computeChecksum(
            "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1",
        );
        expect(checksum).toBe("4CA88C9C");
    });

    it("works using the humanReadableToBinary exported function", async () => {
        const binaryAddress = await humanReadableToBinary(
            "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1#4CA88C9C" as HumanReadableAddress,
        );
        expect(binaryAddress).toBe("0x00010000010114d8da6bf26964af9d7eed9e03e53415d37aa96045");
    });

    // FIXME: use ERC-7828 to reverse resolution of ENS addresses
    it.skip("works using the binaryToHumanReadable exported function", async () => {
        mockGetEnsName.mockResolvedValue("vitalik.eth");
        const humanReadableAddress = await binaryToHumanReadable(
            "0x00010000010114d8da6bf26964af9d7eed9e03e53415d37aa96045" as BinaryAddress,
        );
        expect(humanReadableAddress).toBe("vitalik.eth@eip155:1#4CA88C9C");
    });

    it("works using the computeChecksum exported function", async () => {
        const checksum = await computeChecksum(
            "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1",
        );
        expect(checksum).toBe("4CA88C9C");
    });

    it("build an InteropAddress from a payload using static method", () => {
        const payload = {
            version: 1,
            chainType: "eip155",
            chainReference: "0x1",
            address: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
        };
        const interopAddress = InteropAddressProvider.buildFromPayload(payload);
        expect(interopAddress).toBe("0x00010000010114d8da6bf26964af9d7eed9e03e53415d37aa96045");
    });

    it("build an InteropAddress from a payload using the buildFromPayload exported function", () => {
        const payload = {
            version: 1,
            chainType: "eip155",
            chainReference: "0x1",
            address: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
        };
        const interopAddress = buildFromPayload(payload);
        expect(interopAddress).toBe("0x00010000010114d8da6bf26964af9d7eed9e03e53415d37aa96045");
    });

    it("checks if a human-readable address is a valid interop address", async () => {
        const isValid = await InteropAddressProvider.isValidInteropAddress(
            "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1#4CA88C9C",
        );
        expect(isValid).toBe(true);
    });

    it("checks if a human-readable address is not a valid interop address", async () => {
        const isValid = await InteropAddressProvider.isValidInteropAddress(
            "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1",
        );
        expect(isValid).toBe(false);
    });

    it("checks if a human-readable address is not a valid interop address using the isValidInteropAddress exported function", async () => {
        const isValid = await isValidInteropAddress(
            "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1",
        );
        expect(isValid).toBe(false);
    });

    it("checks if a human-readable address is a valid interop address using the isValidInteropAddress exported function", async () => {
        const isValid = await isValidInteropAddress(
            "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1#4CA88C9C",
        );
        expect(isValid).toBe(true);
    });

    it("checks if a binary address is a valid interop address", async () => {
        const isValid = await InteropAddressProvider.isValidInteropAddress(
            "0x00010000010114d8da6bf26964af9d7eed9e03e53415d37aa96045" as BinaryAddress,
        );
        expect(isValid).toBe(true);
    });

    it("checks if a binary address is not a valid interop address", async () => {
        const isValid = await InteropAddressProvider.isValidInteropAddress(
            "0x0000010114d8da6bf26964af9d7eed9e03e53415d37aa96045" as BinaryAddress,
        );
        expect(isValid).toBe(false);
    });

    it("checks if a binary address is a valid interop address", async () => {
        const isValid = InteropAddressProvider.isValidBinaryAddress(
            "0x00010000010114d8da6bf26964af9d7eed9e03e53415d37aa96045" as BinaryAddress,
        );
        expect(isValid).toBe(true);
    });

    it("checks if a binary address is not a valid interop address", async () => {
        const isValid = InteropAddressProvider.isValidBinaryAddress(
            "0x0000010114d8da6bf26964af9d7eed9e53415da96045" as BinaryAddress,
        );
        expect(isValid).toBe(false);
    });

    it("checks if a binary address is not a valid interop address using the isValidBinaryAddress exported function", async () => {
        const isValid = isValidBinaryAddress(
            "0x0000010114d8da6bf26964af9d7eed9e53415da96045" as BinaryAddress,
        );
        expect(isValid).toBe(false);
    });

    it("checks if a binary address is a valid interop address using the isValidBinaryAddress exported function", async () => {
        const isValid = isValidBinaryAddress(
            "0x00010000010114d8da6bf26964af9d7eed9e03e53415d37aa96045" as BinaryAddress,
        );
        expect(isValid).toBe(true);
    });

    it("checks if a human-readable address is a valid", async () => {
        const isValid = await InteropAddressProvider.isValidHumanReadableAddress(
            "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1#4CA88C9C",
        );
        expect(isValid).toBe(true);
    });

    it("checks if a human-readable address is not valid", async () => {
        const isValid = await InteropAddressProvider.isValidHumanReadableAddress(
            "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1",
        );
        expect(isValid).toBe(false);
    });

    it("checks if a human-readable address is valid using the isValidHumanReadableAddress exported function", async () => {
        const isValid = await isValidHumanReadableAddress(
            "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1#4CA88C9C",
        );
        expect(isValid).toBe(true);
    });

    it("checks if a human-readable address is not valid using the isValidHumanReadableAddress exported function", async () => {
        const isValid = await isValidHumanReadableAddress(
            "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1",
        );
        expect(isValid).toBe(false);
    });

    it("checks if a human-readable address is valid using the isValidHumanReadableAddress exported function with validateChecksumFlag set to false", async () => {
        const isValid = await isValidHumanReadableAddress(
            "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1",
            { validateChecksumFlag: false },
        );
        expect(isValid).toBe(true);
    });

    it("checks if a human-readable address is not valid using the isValidHumanReadableAddress exported function with validateChecksumFlag set to true", async () => {
        const isValid = await isValidHumanReadableAddress(
            "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1",
            { validateChecksumFlag: true },
        );
        expect(isValid).toBe(false);
    });
});
