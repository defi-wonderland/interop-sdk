import { describe, expect, it } from "vitest";

import type { InteroperableAddress } from "../../src/types/interopAddress.js";
import { calculateChecksum, decodeAddress } from "../../src/address/index.js";
import { formatName } from "../../src/name/index.js";

describe("formatName", () => {
    it("formats a complete interoperable name from text representation", () => {
        const addr: InteroperableAddress = {
            version: 1,
            chainType: "eip155",
            chainReference: "1",
            address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
        };

        const name = formatName(addr);

        expect(name).toBe("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1#4CA88C9C");
    });

    it("formats a Solana address from text representation", () => {
        const addr: InteroperableAddress = {
            version: 1,
            chainType: "solana",
            chainReference: "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d",
            address: "MJKqp326RZCHnAAbew9MDdui3iCKWco7fsK9sVuZTX2",
        };

        const name = formatName(addr);

        expect(name).toBe(
            "MJKqp326RZCHnAAbew9MDdui3iCKWco7fsK9sVuZTX2@solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d#88835C11",
        );
    });

    it("formats name without address from text representation", () => {
        const addr: InteroperableAddress = {
            version: 1,
            chainType: "eip155",
            chainReference: "1",
        };

        const name = formatName(addr);

        expect(name).toBe("@eip155:1#F54D4FBF");
    });

    it("formats name without chain reference from text representation", () => {
        const addr: InteroperableAddress = {
            version: 1,
            chainType: "eip155",
            address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
        };

        const checksum = calculateChecksum(addr);
        const name = formatName(addr);

        expect(name).toBe(`0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:#${checksum}`);
    });

    it("formats L2 address from text representation", () => {
        const addr: InteroperableAddress = {
            version: 1,
            chainType: "eip155",
            chainReference: "8453",
            address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
        };

        const name = formatName(addr);

        expect(name).toBe("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:8453#17DE0709");
    });

    it("formats address from binary representation", () => {
        const addr = decodeAddress("0x00010000010114d8da6bf26964af9d7eed9e03e53415d37aa96045", {
            representation: "binary",
        });

        const name = formatName(addr);

        expect(name).toBe("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1#4CA88C9C");
    });

    it("formats name without checksum when includeChecksum is false", () => {
        const addr: InteroperableAddress = {
            version: 1,
            chainType: "eip155",
            chainReference: "1",
            address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
        };

        const name = formatName(addr, { includeChecksum: false });

        expect(name).toBe("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1");
    });
});
