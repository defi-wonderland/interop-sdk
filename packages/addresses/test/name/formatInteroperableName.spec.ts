import { describe, expect, it } from "vitest";

import type { Checksum } from "../../src/types/checksum.js";
import type { InteroperableAddressText } from "../../src/types/interopAddress.js";
import { formatName } from "../../src/name/index.js";

describe("formatName", () => {
    it("formats a complete interoperable name", () => {
        const text: InteroperableAddressText = {
            version: 1,
            chainType: "eip155",
            chainReference: "1",
            address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
        };
        const checksum = "4CA88C9C" as Checksum;

        const name = formatName(text, checksum);

        expect(name).toBe("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1#4CA88C9C");
    });

    it("formats a Solana address", () => {
        const text: InteroperableAddressText = {
            version: 1,
            chainType: "solana",
            chainReference: "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d",
            address: "MJKqp326RZCHnAAbew9MDdui3iCKWco7fsK9sVuZTX2",
        };
        const checksum = "88835C11" as Checksum;

        const name = formatName(text, checksum);

        expect(name).toBe(
            "MJKqp326RZCHnAAbew9MDdui3iCKWco7fsK9sVuZTX2@solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d#88835C11",
        );
    });

    it("formats name without address", () => {
        const text: InteroperableAddressText = {
            version: 1,
            chainType: "eip155",
            chainReference: "1",
        };
        const checksum = "F54D4FBF" as Checksum;

        const name = formatName(text, checksum);

        expect(name).toBe("@eip155:1#F54D4FBF");
    });

    it("formats name without chain reference", () => {
        const text: InteroperableAddressText = {
            version: 1,
            chainType: "eip155",
            address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
        };
        const checksum = "4CA88C9C" as Checksum;

        const name = formatName(text, checksum);

        expect(name).toBe("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:#4CA88C9C");
    });

    it("formats name without address and chain reference", () => {
        const text: InteroperableAddressText = {
            version: 1,
            chainType: "solana",
        };
        const checksum = "F40BB840" as Checksum;

        const name = formatName(text, checksum);

        expect(name).toBe("@solana:#F40BB840");
    });

    it("formats L2 address", () => {
        const text: InteroperableAddressText = {
            version: 1,
            chainType: "eip155",
            chainReference: "8453",
            address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
        };
        const checksum = "17DE0709" as Checksum;

        const name = formatName(text, checksum);

        expect(name).toBe("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:8453#17DE0709");
    });

    it("formats ENS name", () => {
        const text: InteroperableAddressText = {
            version: 1,
            chainType: "eip155",
            chainReference: "1",
            address: "vitalik.eth",
        };
        const checksum = "4CA88C9C" as Checksum;

        const name = formatName(text, checksum);

        expect(name).toBe("vitalik.eth@eip155:1#4CA88C9C");
    });
});
