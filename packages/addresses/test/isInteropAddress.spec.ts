import { describe, expect, it } from "vitest";

import { HumanReadableAddress, isInteropAddress } from "../src/internal.js";

describe("isInteropAddress", () => {
    it("true if the address is a valid interop address", async () => {
        const humanReadableAddress = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1#4CA88C9C";
        expect(await isInteropAddress(humanReadableAddress as HumanReadableAddress)).toBe(true);
    });

    it("false if legacy address", async () => {
        const humanReadableAddress = "0xd8dA6BF26964aF9D7eEd9e03E53415D37";
        expect(await isInteropAddress(humanReadableAddress as HumanReadableAddress)).toBe(false);
    });

    it("false if address is missing chain reference", async () => {
        const humanReadableAddress = "0xd8dA6BF26964aF9D7eEd9e03E53415D37@eip155";
        expect(await isInteropAddress(humanReadableAddress as HumanReadableAddress)).toBe(false);
    });

    it("false if address is missing chain namespace", async () => {
        const humanReadableAddress = "0xd8dA6BF26964aF9D7eEd9e03E53415D37@:1#4CA88C9C";
        expect(await isInteropAddress(humanReadableAddress as HumanReadableAddress)).toBe(false);
    });

    it("true for human readable address without account id", async () => {
        const humanReadableAddress = "@eip155:1#F54D4FBF";
        expect(await isInteropAddress(humanReadableAddress as HumanReadableAddress)).toBe(true);
    });

    it("false if chain is invalid", async () => {
        const humanReadableAddress = "vitalik.eth@eip155:1000000#4CA88C9C";
        expect(await isInteropAddress(humanReadableAddress as HumanReadableAddress)).toBe(false);
    });

    it("false if checksum is invalid", async () => {
        const humanReadableAddress = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1#FFFFFFFF";
        expect(await isInteropAddress(humanReadableAddress as HumanReadableAddress)).toBe(false);
    });

    it("false if checksum is missing", async () => {
        const humanReadableAddress = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1";
        expect(await isInteropAddress(humanReadableAddress as HumanReadableAddress)).toBe(false);
    });

    it("false if chain reference is invalid", async () => {
        const humanReadableAddress =
            "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1000000#4CA88C9C";
        expect(await isInteropAddress(humanReadableAddress as HumanReadableAddress)).toBe(false);
    });
});
