import { describe, expect, it } from "vitest";

import { BIP122_ADDRESS_TYPE } from "../../../src/address/bip122/constants.js";
import { bip122AddressToBinary, bip122AddressToText } from "../../../src/address/bip122/index.js";
import {
    BIP122_MAINNET_CHAIN_REF,
    BIP122_P2SH_ADDRESS,
    BIP122_SEGWIT_ADDRESS,
    BIP122_TAPROOT_ADDRESS,
    BIP122_TESTNET_CHAIN_REF,
    BIP122_TESTNET_SEGWIT_ADDRESS,
} from "./fixtures.js";

describe("bip122AddressToBinary", () => {
    it("tags a P2SH address with the P2SH type prefix", () => {
        const binary = bip122AddressToBinary(BIP122_P2SH_ADDRESS);
        expect(binary[0]).toBe(BIP122_ADDRESS_TYPE.BASE58CHECK);
    });

    it("tags a SegWit v0 address with WITNESS prefix and version 0", () => {
        const binary = bip122AddressToBinary(BIP122_SEGWIT_ADDRESS);
        expect(binary[0]).toBe(BIP122_ADDRESS_TYPE.WITNESS);
        expect(binary[1]).toBe(0);
    });

    it("tags a Taproot address with WITNESS prefix and version 1", () => {
        const binary = bip122AddressToBinary(BIP122_TAPROOT_ADDRESS);
        expect(binary[0]).toBe(BIP122_ADDRESS_TYPE.WITNESS);
        expect(binary[1]).toBe(1);
    });

    it("tags a testnet SegWit address with WITNESS prefix and version 0", () => {
        const binary = bip122AddressToBinary(BIP122_TESTNET_SEGWIT_ADDRESS);
        expect(binary[0]).toBe(BIP122_ADDRESS_TYPE.WITNESS);
        expect(binary[1]).toBe(0);
    });
});

describe("bip122AddressToText", () => {
    it("roundtrips a P2SH address", () => {
        const binary = bip122AddressToBinary(BIP122_P2SH_ADDRESS);
        expect(bip122AddressToText(binary)).toBe(BIP122_P2SH_ADDRESS);
    });

    it("roundtrips a SegWit v0 address", () => {
        const binary = bip122AddressToBinary(BIP122_SEGWIT_ADDRESS);
        expect(bip122AddressToText(binary, BIP122_MAINNET_CHAIN_REF)).toBe(BIP122_SEGWIT_ADDRESS);
    });

    it("roundtrips a Taproot address", () => {
        const binary = bip122AddressToBinary(BIP122_TAPROOT_ADDRESS);
        expect(bip122AddressToText(binary, BIP122_MAINNET_CHAIN_REF)).toBe(BIP122_TAPROOT_ADDRESS);
    });

    it("roundtrips a testnet SegWit address", () => {
        const binary = bip122AddressToBinary(BIP122_TESTNET_SEGWIT_ADDRESS);
        expect(bip122AddressToText(binary, BIP122_TESTNET_CHAIN_REF)).toBe(
            BIP122_TESTNET_SEGWIT_ADDRESS,
        );
    });

    it("throws for witness address without chain reference", () => {
        const binary = bip122AddressToBinary(BIP122_SEGWIT_ADDRESS);
        expect(() => bip122AddressToText(binary)).toThrow("chain reference");
    });

    it("throws for unknown type prefix", () => {
        const binary = new Uint8Array([0xff, 0x00]);
        expect(() => bip122AddressToText(binary)).toThrow("Unknown bip122 address type");
    });
});
