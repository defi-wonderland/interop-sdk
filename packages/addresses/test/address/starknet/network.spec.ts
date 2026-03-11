import { describe, expect, it } from "vitest";

import { isValidStarknetChainReference } from "../../../src/address/starknet/network.js";
import {
    STARKNET_MAINNET_CHAIN_REF,
    STARKNET_SEPOLIA_CHAIN_REF,
    STARKNET_TESTNET_CHAIN_REF,
} from "./fixtures.js";

describe("isValidStarknetChainReference", () => {
    it("accepts SN_MAIN", () => {
        expect(isValidStarknetChainReference(STARKNET_MAINNET_CHAIN_REF)).toBe(true);
    });

    it("accepts SN_GOERLI", () => {
        expect(isValidStarknetChainReference(STARKNET_TESTNET_CHAIN_REF)).toBe(true);
    });

    it("accepts SN_SEPOLIA", () => {
        expect(isValidStarknetChainReference(STARKNET_SEPOLIA_CHAIN_REF)).toBe(true);
    });

    it("rejects unknown chain references", () => {
        expect(isValidStarknetChainReference("SN_UNKNOWN")).toBe(false);
    });

    it("rejects lowercase variants", () => {
        expect(isValidStarknetChainReference("sn_main")).toBe(false);
    });

    it("rejects empty string", () => {
        expect(isValidStarknetChainReference("")).toBe(false);
    });
});
