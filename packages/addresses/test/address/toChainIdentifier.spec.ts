import { describe, expect, it } from "vitest";

import { toChainIdentifier } from "../../src/address/chainIdentifier.js";
import { ChainTypeName } from "../../src/internal.js";

describe("toChainIdentifier", () => {
    it("should convert Ethereum mainnet chain ID to CAIP-350 format", () => {
        expect(toChainIdentifier(1)).toBe("eip155:1");
    });

    it("should convert Sepolia chain ID to CAIP-350 format", () => {
        expect(toChainIdentifier(11155111)).toBe("eip155:11155111");
    });

    it("should use custom chain type when provided", () => {
        expect(toChainIdentifier(1, ChainTypeName.SOLANA)).toBe("solana:1");
    });

    it("should use eip155 as default chain type", () => {
        expect(toChainIdentifier(137)).toBe(toChainIdentifier(137, ChainTypeName.EIP155));
    });
});
