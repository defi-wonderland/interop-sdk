import { describe, expect, it } from "vitest";

import {
    binaryToHumanReadable,
    buildFromPayload,
    computeChecksum,
    humanReadableToBinary,
    InteropAddressProvider,
    isValidInteropAddress,
} from "../src/providers/InteropAddressProvider.js";
import { BinaryAddress, HumanReadableAddress } from "../src/types/index.js";

describe("InteropAddressProvider", () => {
    it("convert a human-readable address to a binary address", async () => {
        const binaryAddress = await InteropAddressProvider.humanReadableToBinary(
            "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1#4CA88C9C" as HumanReadableAddress,
        );
        expect(binaryAddress).toBe("0x00010000010114d8da6bf26964af9d7eed9e03e53415d37aa96045");
    });

    it("convert a binary address to a human-readable address", async () => {
        const humanReadableAddress = InteropAddressProvider.binaryToHumanReadable(
            "0x00010000010114d8da6bf26964af9d7eed9e03e53415d37aa96045" as BinaryAddress,
        );
        expect(humanReadableAddress).toBe(
            "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1#4CA88C9C",
        );
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

    it("works using the binaryToHumanReadable exported function", async () => {
        const humanReadableAddress = binaryToHumanReadable(
            "0x00010000010114d8da6bf26964af9d7eed9e03e53415d37aa96045" as BinaryAddress,
        );
        expect(humanReadableAddress).toBe(
            "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1#4CA88C9C",
        );
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
});
