import { beforeEach, describe, expect, it, vi } from "vitest";

import { parseName } from "../../src/name/index.js";
import { isTextAddress } from "../../src/types/interopAddress.js";

const { mockResolveChainFromRegistry } = vi.hoisted(() => {
    const mockResolveChainFromRegistry = vi.fn();
    return { mockResolveChainFromRegistry };
});

vi.mock("../../src/name/resolveChainFromRegistry.js", () => ({
    resolveChainFromRegistry: mockResolveChainFromRegistry,
}));

const { mockShortnameToChainId } = vi.hoisted(() => {
    const mockShortnameToChainId = vi.fn();
    return { mockShortnameToChainId };
});

vi.mock("../../src/name/shortnameToChainId.js", () => ({
    shortnameToChainId: mockShortnameToChainId,
}));

const mockGetEnsAddress = vi.fn();
vi.mock("viem", async () => {
    const actual = await vi.importActual("viem");
    return {
        ...actual,
        createPublicClient: (): unknown => ({
            getEnsAddress: mockGetEnsAddress,
        }),
    };
});

describe("parseName with useExperimentalChainRegistry", () => {
    beforeEach(() => {
        mockResolveChainFromRegistry.mockReset();
        mockShortnameToChainId.mockReset();
        mockGetEnsAddress.mockReset();
    });

    describe("when useExperimentalChainRegistry is provided", () => {
        it("uses onchain registry for chain resolution", async () => {
            mockResolveChainFromRegistry.mockResolvedValue({
                chainType: "eip155",
                chainReference: "1",
            });

            const result = await parseName("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eth", {
                useExperimentalChainRegistry: "cid.eth",
            });

            expect(mockResolveChainFromRegistry).toHaveBeenCalledWith("eth", "cid.eth");
            expect(mockShortnameToChainId).not.toHaveBeenCalled();
            expect(isTextAddress(result.interoperableAddress)).toBe(true);
            if (isTextAddress(result.interoperableAddress)) {
                expect(result.interoperableAddress.chainType).toBe("eip155");
                expect(result.interoperableAddress.chainReference).toBe("1");
            }
            expect(result.meta.isChainLabel).toBe(true);
        });

        it("falls back to offchain when onchain returns null", async () => {
            mockResolveChainFromRegistry.mockResolvedValue(null);
            mockShortnameToChainId.mockResolvedValue(1);

            const result = await parseName("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eth", {
                useExperimentalChainRegistry: "cid.eth",
            });

            expect(mockResolveChainFromRegistry).toHaveBeenCalledWith("eth", "cid.eth");
            expect(mockShortnameToChainId).toHaveBeenCalledWith("eth");
            expect(isTextAddress(result.interoperableAddress)).toBe(true);
            if (isTextAddress(result.interoperableAddress)) {
                expect(result.interoperableAddress.chainType).toBe("eip155");
                expect(result.interoperableAddress.chainReference).toBe("1");
            }
        });

        it("works with different registry domains", async () => {
            mockResolveChainFromRegistry.mockResolvedValue({
                chainType: "eip155",
                chainReference: "42161",
            });

            const result = await parseName("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@arb1", {
                useExperimentalChainRegistry: "on.eth",
            });

            expect(mockResolveChainFromRegistry).toHaveBeenCalledWith("arb1", "on.eth");
            if (isTextAddress(result.interoperableAddress)) {
                expect(result.interoperableAddress.chainReference).toBe("42161");
            }
        });

        it("preserves other options like representation", async () => {
            mockResolveChainFromRegistry.mockResolvedValue({
                chainType: "eip155",
                chainReference: "1",
            });

            const result = await parseName("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eth", {
                useExperimentalChainRegistry: "cid.eth",
                representation: "binary",
            });

            expect(result.interoperableAddress.chainType instanceof Uint8Array).toBe(true);
        });
    });

    describe("when useExperimentalChainRegistry is NOT provided", () => {
        it("uses offchain resolution only", async () => {
            mockShortnameToChainId.mockResolvedValue(1);

            const result = await parseName("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eth");

            expect(mockResolveChainFromRegistry).not.toHaveBeenCalled();
            expect(mockShortnameToChainId).toHaveBeenCalledWith("eth");
            if (isTextAddress(result.interoperableAddress)) {
                expect(result.interoperableAddress.chainType).toBe("eip155");
                expect(result.interoperableAddress.chainReference).toBe("1");
            }
        });
    });

    describe("when chainType is explicitly provided", () => {
        it("does not use registry (explicit chain takes precedence)", async () => {
            const result = await parseName("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1", {
                useExperimentalChainRegistry: "cid.eth",
            });

            // When both chainType and chainReference are provided, no resolution is needed
            expect(mockResolveChainFromRegistry).not.toHaveBeenCalled();
            expect(mockShortnameToChainId).not.toHaveBeenCalled();
            if (isTextAddress(result.interoperableAddress)) {
                expect(result.interoperableAddress.chainType).toBe("eip155");
                expect(result.interoperableAddress.chainReference).toBe("1");
            }
            expect(result.meta.isChainLabel).toBe(false);
        });
    });

    describe("edge cases", () => {
        it("handles combined ENS address resolution with chain registry", async () => {
            mockResolveChainFromRegistry.mockResolvedValue({
                chainType: "eip155",
                chainReference: "1",
            });
            mockGetEnsAddress.mockResolvedValue("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");

            const result = await parseName("vitalik.eth@eth", {
                useExperimentalChainRegistry: "cid.eth",
            });

            expect(mockResolveChainFromRegistry).toHaveBeenCalledWith("eth", "cid.eth");
            expect(result.meta.isENS).toBe(true);
            expect(result.meta.isChainLabel).toBe(true);
            if (isTextAddress(result.interoperableAddress)) {
                expect(result.interoperableAddress.address).toBe(
                    "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
                );
            }
        });

        it("calculates checksum correctly with registry resolution", async () => {
            mockResolveChainFromRegistry.mockResolvedValue({
                chainType: "eip155",
                chainReference: "1",
            });

            const result = await parseName("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eth", {
                useExperimentalChainRegistry: "cid.eth",
            });

            // Checksum should be calculated based on resolved chain
            expect(result.meta.checksum).toBeDefined();
            expect(typeof result.meta.checksum).toBe("string");
            expect(result.meta.checksum?.length).toBe(8);
        });
    });
});
