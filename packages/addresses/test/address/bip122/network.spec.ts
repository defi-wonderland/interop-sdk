import { fromHex } from "viem";
import { describe, expect, it } from "vitest";

import { hrpFromChainReference } from "../../../src/address/bip122/network.js";
import { BIP122_MAINNET_CHAIN_REF, BIP122_TESTNET_CHAIN_REF } from "./fixtures.js";

describe("hrpFromChainReference", () => {
    it("returns 'bc' for Bitcoin mainnet genesis hash", () => {
        expect(hrpFromChainReference(BIP122_MAINNET_CHAIN_REF)).toBe("bc");
    });

    it("returns 'tb' for Bitcoin testnet genesis hash", () => {
        expect(hrpFromChainReference(BIP122_TESTNET_CHAIN_REF)).toBe("tb");
    });

    it("throws for unknown chain reference", () => {
        const unknown = fromHex("0x00000000000000000000000000000000", "bytes");
        expect(() => hrpFromChainReference(unknown)).toThrow("Unknown Bitcoin network");
    });
});
