import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    clearRegistryCache,
    resolveChainFromRegistry,
} from "../../src/name/resolveChainFromRegistry.js";

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
        clearRegistryCache();
    });

    it("resolves 'optimism' to eip155:10 using cid.eth registry", async () => {
        // First call: ENS registry.resolver(node) returns resolver address
        mockReadContract.mockResolvedValueOnce("0x1234567890123456789012345678901234567890");
        // Second call: ChainResolver.interoperableAddress(label) returns bytes
        // ERC-7930 format: 0x0001 (version) + 0x0000 (eip155) + 0x01 (chainRefLen) + 0x0a (10) + 0x00 (addrLen)
        mockReadContract.mockResolvedValueOnce("0x00010000010a00");

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
        // ERC-7930 format for arbitrum (chain ID 42161 = 0xa4b1)
        mockReadContract.mockResolvedValueOnce("0x0001000002a4b100");

        const result = await resolveChainFromRegistry("arbitrum", "cid.eth");

        expect(result).toEqual({ chainType: "eip155", chainReference: "42161" });
    });

    it("resolves using different registry domains", async () => {
        mockReadContract.mockResolvedValueOnce("0xABCDEF1234567890ABCDEF1234567890ABCDEF12");
        // ERC-7930 format: 0x0001 (version) + 0x0000 (eip155) + 0x01 (chainRefLen) + 0x01 (chain ID 1) + 0x00 (addrLen)
        mockReadContract.mockResolvedValueOnce("0x00010000010100");

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

    it("caches resolution results and skips RPC on repeated calls", async () => {
        // First call: resolver + interoperableAddress
        mockReadContract.mockResolvedValueOnce("0x1234567890123456789012345678901234567890");
        mockReadContract.mockResolvedValueOnce("0x00010000010a00");

        const result1 = await resolveChainFromRegistry("optimism", "cid.eth");
        expect(result1).toEqual({ chainType: "eip155", chainReference: "10" });
        expect(mockReadContract).toHaveBeenCalledTimes(2);

        // Second call: should return cached result with no additional RPC calls
        const result2 = await resolveChainFromRegistry("optimism", "cid.eth");
        expect(result2).toEqual({ chainType: "eip155", chainReference: "10" });
        expect(mockReadContract).toHaveBeenCalledTimes(2); // still 2, no new calls
    });

    it("caches resolver address across different labels for same domain", async () => {
        // First call: resolver + interoperableAddress for "optimism"
        mockReadContract.mockResolvedValueOnce("0x1234567890123456789012345678901234567890");
        mockReadContract.mockResolvedValueOnce("0x00010000010a00");

        await resolveChainFromRegistry("optimism", "cid.eth");
        expect(mockReadContract).toHaveBeenCalledTimes(2);

        // Second call for different label, same domain: only interoperableAddress (resolver is cached)
        mockReadContract.mockResolvedValueOnce("0x0001000002a4b100");

        const result = await resolveChainFromRegistry("arbitrum", "cid.eth");
        expect(result).toEqual({ chainType: "eip155", chainReference: "42161" });
        expect(mockReadContract).toHaveBeenCalledTimes(3); // only 1 new call (no resolver lookup)
    });

    it("caches null results for failed lookups", async () => {
        mockReadContract.mockResolvedValueOnce("0x1234567890123456789012345678901234567890");
        mockReadContract.mockResolvedValueOnce("0x");

        const result1 = await resolveChainFromRegistry("unknown", "cid.eth");
        expect(result1).toBeNull();
        expect(mockReadContract).toHaveBeenCalledTimes(2);

        // Second call: should return cached null with no additional RPC calls
        const result2 = await resolveChainFromRegistry("unknown", "cid.eth");
        expect(result2).toBeNull();
        expect(mockReadContract).toHaveBeenCalledTimes(2);
    });

    it("deduplicates concurrent requests for the same label+domain", async () => {
        mockReadContract.mockResolvedValueOnce("0x1234567890123456789012345678901234567890");
        mockReadContract.mockResolvedValueOnce("0x00010000010a00");

        // Fire two requests concurrently — they should share a single in-flight promise
        const [result1, result2] = await Promise.all([
            resolveChainFromRegistry("optimism", "cid.eth"),
            resolveChainFromRegistry("optimism", "cid.eth"),
        ]);

        expect(result1).toEqual({ chainType: "eip155", chainReference: "10" });
        expect(result2).toEqual({ chainType: "eip155", chainReference: "10" });
        expect(mockReadContract).toHaveBeenCalledTimes(2); // only 1 resolver + 1 interopAddress
    });

    it("retries after a transient RPC error (does not cache errors)", async () => {
        // First call: fails
        mockReadContract.mockRejectedValueOnce(new Error("RPC error"));

        const result1 = await resolveChainFromRegistry("optimism", "cid.eth");
        expect(result1).toBeNull();

        // Second call: succeeds — error was not cached
        mockReadContract.mockResolvedValueOnce("0x1234567890123456789012345678901234567890");
        mockReadContract.mockResolvedValueOnce("0x00010000010a00");

        const result2 = await resolveChainFromRegistry("optimism", "cid.eth");
        expect(result2).toEqual({ chainType: "eip155", chainReference: "10" });
    });
});
