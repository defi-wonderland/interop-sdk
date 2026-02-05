import { beforeEach, describe, expect, it, vi } from "vitest";

import { resolveChainFromRegistry } from "../../src/name/resolveChainFromRegistry.js";

const mockReadContract = vi.fn();

vi.mock("viem", async () => {
    const actual = await vi.importActual("viem");
    return {
        ...actual,
        createPublicClient: (): { readContract: typeof mockReadContract } => ({
            readContract: mockReadContract,
        }),
    };
});

describe("resolveChainFromRegistry", () => {
    beforeEach(() => {
        mockReadContract.mockReset();
    });

    it("resolves 'optimism' to eip155:10 using cid.eth registry", async () => {
        // First call: ENS registry.resolver(node) returns resolver address
        mockReadContract.mockResolvedValueOnce("0x1234567890123456789012345678901234567890");
        // Second call: ChainResolver.interoperableAddress(label) returns bytes
        // Registry format: 0x0001 (version) + 0x0001 (eip155 - registry bug) + 0x01 (chainRefLen) + 0x0a (10) + 0x00 (addrLen)
        mockReadContract.mockResolvedValueOnce("0x00010001010a00");

        const result = await resolveChainFromRegistry("optimism", "cid.eth");

        expect(result).toEqual({ chainType: "eip155", chainReference: "10" });
        expect(mockReadContract).toHaveBeenCalledTimes(2);

        // Verify first call was to ENS registry for resolver lookup
        expect(mockReadContract.mock.calls[0][0]).toMatchObject({
            address: "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e",
            functionName: "resolver",
        });

        // Verify second call was to resolver for interoperableAddress lookup
        expect(mockReadContract.mock.calls[1][0]).toMatchObject({
            functionName: "interoperableAddress",
            args: ["optimism"],
        });
    });

    it("resolves chain with 2-byte chain reference (arbitrum)", async () => {
        mockReadContract.mockResolvedValueOnce("0x1234567890123456789012345678901234567890");
        // Registry format for arbitrum (chain ID 42161 = 0xa4b1): missing trailing 0x00
        mockReadContract.mockResolvedValueOnce("0x0001000102a4b1");

        const result = await resolveChainFromRegistry("arbitrum", "cid.eth");

        expect(result).toEqual({ chainType: "eip155", chainReference: "42161" });
    });

    it("resolves using different registry domains", async () => {
        mockReadContract.mockResolvedValueOnce("0xABCDEF1234567890ABCDEF1234567890ABCDEF12");
        mockReadContract.mockResolvedValueOnce("0x00010001010100");

        const result = await resolveChainFromRegistry("eth", "on.eth");

        expect(result).toEqual({ chainType: "eip155", chainReference: "1" });
    });

    it("returns null when resolver not found (zero address)", async () => {
        mockReadContract.mockResolvedValueOnce("0x0000000000000000000000000000000000000000");

        const result = await resolveChainFromRegistry("unknown", "cid.eth");

        expect(result).toBeNull();
        expect(mockReadContract).toHaveBeenCalledTimes(1);
    });

    it("returns null when resolver returns null", async () => {
        mockReadContract.mockResolvedValueOnce(null);

        const result = await resolveChainFromRegistry("unknown", "cid.eth");

        expect(result).toBeNull();
        expect(mockReadContract).toHaveBeenCalledTimes(1);
    });

    it("returns null when interoperableAddress returns empty bytes", async () => {
        mockReadContract.mockResolvedValueOnce("0x1234567890123456789012345678901234567890");
        mockReadContract.mockResolvedValueOnce("0x");

        const result = await resolveChainFromRegistry("unknown", "cid.eth");

        expect(result).toBeNull();
        expect(mockReadContract).toHaveBeenCalledTimes(2);
    });

    it("returns null when interoperableAddress returns null", async () => {
        mockReadContract.mockResolvedValueOnce("0x1234567890123456789012345678901234567890");
        mockReadContract.mockResolvedValueOnce(null);

        const result = await resolveChainFromRegistry("unknown", "cid.eth");

        expect(result).toBeNull();
        expect(mockReadContract).toHaveBeenCalledTimes(2);
    });

    it("returns null on RPC error (allows fallback)", async () => {
        mockReadContract.mockRejectedValue(new Error("RPC error"));

        const result = await resolveChainFromRegistry("eth", "cid.eth");

        expect(result).toBeNull();
    });

    it("returns null on contract call revert", async () => {
        mockReadContract.mockRejectedValue(new Error("execution reverted"));

        const result = await resolveChainFromRegistry("eth", "cid.eth");

        expect(result).toBeNull();
    });

    it("returns null for unknown chain type", async () => {
        mockReadContract.mockResolvedValueOnce("0x1234567890123456789012345678901234567890");
        // Unknown chain type 0x0099
        mockReadContract.mockResolvedValueOnce("0x00010099010100");

        const result = await resolveChainFromRegistry("unknown", "cid.eth");

        expect(result).toBeNull();
    });

    it("handles correct ERC-7930 format (if registry is fixed)", async () => {
        mockReadContract.mockResolvedValueOnce("0x1234567890123456789012345678901234567890");
        // Correct ERC-7930 format: 0x0000 for eip155
        mockReadContract.mockResolvedValueOnce("0x00010000010100");

        const result = await resolveChainFromRegistry("eth", "cid.eth");

        expect(result).toEqual({ chainType: "eip155", chainReference: "1" });
    });
});
