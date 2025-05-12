import { fromHex, Hex } from "viem";
import { describe, expect, it } from "vitest";

import {
    buildInteropAddress,
    CHAIN_TYPE,
    InvalidAddress,
    InvalidChainReference,
    UnsupportedChainType,
} from "../src/internal.js";

describe("buildInteropAddress", () => {
    it("build an InteropAddress from a eip155 address", () => {
        const interopAddress = buildInteropAddress({
            version: 1,
            chainType: "eip155",
            chainReference: "0x1",
            address: "0x1",
        });

        expect(interopAddress).toBeDefined();
        expect(interopAddress.version).toBe(1);
        expect(interopAddress.chainType).toEqual(fromHex(CHAIN_TYPE["eip155"] as Hex, "bytes"));
        expect(interopAddress.chainReference).toEqual(fromHex("0x1", "bytes"));
        expect(interopAddress.address).toEqual(fromHex("0x1", "bytes"));
    });

    it("build an InteropAddress from a solana address", () => {
        const interopAddress = buildInteropAddress({
            version: 1,
            chainType: "solana",
            chainReference: "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d",
            address: "MJKqp326RZCHnAAbew9MDdui3iCKWco7fsK9sVuZTX2",
        });

        expect(interopAddress).toBeDefined();
        expect(interopAddress.version).toBe(1);
        expect(interopAddress.chainType).toEqual(fromHex(CHAIN_TYPE["solana"] as Hex, "bytes"));
        expect(interopAddress.chainReference).toEqual(
            fromHex("0x45296998a6f8e2a784db5d9f95e18fc23f70441a1039446801089879b08c7ef0", "bytes"),
        );
        expect(interopAddress.address).toEqual(
            fromHex("0x05333498d5aea4ae009585c43f7b8c30df8e70187d4a713d134f977fc8dfe0b5", "bytes"),
        );
    });

    it("throws error if chain type is not supported", () => {
        expect(() =>
            buildInteropAddress({
                version: 1,
                chainType: "not-supported",
                chainReference: "0x1",
                address: "0x1",
            }),
        ).toThrow(UnsupportedChainType);
    });

    it("throw error if chain reference is not hex when chain type is eip155", () => {
        expect(() =>
            buildInteropAddress({
                version: 1,
                chainType: "eip155",
                chainReference: "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d",
                address: "0x1",
            }),
        ).toThrow(InvalidChainReference);
    });

    it("throw error if chain reference is not base58 when chain type is solana", () => {
        expect(() =>
            buildInteropAddress({
                version: 1,
                chainType: "solana",
                chainReference: "0x1",
                address: "0x1",
            }),
        ).toThrow(InvalidChainReference);
    });

    it("throw error if address is not hex when chain type is eip155", () => {
        expect(() =>
            buildInteropAddress({
                version: 1,
                chainType: "eip155",
                chainReference: "0x1",
                address: "MJKqp326RZCHnAAbew9MDdui3iCKWco7fsK9sVuZTX2",
            }),
        ).toThrow(InvalidAddress);
    });

    it("throw error if address is not base58 when chain type is solana", () => {
        expect(() =>
            buildInteropAddress({
                version: 1,
                chainType: "solana",
                chainReference: "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d",
                address: "0x1",
            }),
        ).toThrow(InvalidAddress);
    });
});
