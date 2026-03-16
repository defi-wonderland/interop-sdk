import { beforeEach, describe, expect, it, vi } from "vitest";

import { parseName } from "../../src/name/index.js";
import { isTextAddress } from "../../src/types/interopAddress.js";

const { mockResolveChainFromRegistry } = vi.hoisted(() => {
    const mockResolveChainFromRegistry = vi.fn();
    return { mockResolveChainFromRegistry };
});

vi.mock("../../src/name/resolveChainFromRegistry.js", async (importOriginal) => {
    const actual =
        await importOriginal<typeof import("../../src/name/resolveChainFromRegistry.js")>();
    return {
        ...actual,
        resolveChainFromRegistry: mockResolveChainFromRegistry,
    };
});

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

describe("parseName with onchain registry", () => {
    beforeEach(() => {
        mockResolveChainFromRegistry.mockReset();
        mockShortnameToChainId.mockReset();
        mockGetEnsAddress.mockReset();
    });

    describe("default behavior (onchain registry enabled)", () => {
        it("uses onchain registry by default with on.eth", async () => {
            mockResolveChainFromRegistry.mockResolvedValue({
                chainType: "eip155",
                chainReference: "1",
            });

            const result = await parseName("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eth");

            expect(mockResolveChainFromRegistry).toHaveBeenCalledWith("eth", "on.eth", undefined);
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

            const result = await parseName("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eth");

            expect(mockResolveChainFromRegistry).toHaveBeenCalledWith("eth", "on.eth", undefined);
            expect(mockShortnameToChainId).toHaveBeenCalledWith("eth");
            expect(isTextAddress(result.interoperableAddress)).toBe(true);
            if (isTextAddress(result.interoperableAddress)) {
                expect(result.interoperableAddress.chainType).toBe("eip155");
                expect(result.interoperableAddress.chainReference).toBe("1");
            }
        });
    });

    describe("custom onchainRegistry domain", () => {
        it("uses the specified registry domain", async () => {
            mockResolveChainFromRegistry.mockResolvedValue({
                chainType: "eip155",
                chainReference: "42161",
            });

            const result = await parseName("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@arb1", {
                onchainRegistry: "custom.eth",
            });

            expect(mockResolveChainFromRegistry).toHaveBeenCalledWith(
                "arb1",
                "custom.eth",
                undefined,
            );
            if (isTextAddress(result.interoperableAddress)) {
                expect(result.interoperableAddress.chainReference).toBe("42161");
            }
        });

        it("uses on.eth when onchainRegistry is true", async () => {
            mockResolveChainFromRegistry.mockResolvedValue({
                chainType: "eip155",
                chainReference: "1",
            });

            await parseName("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eth", {
                onchainRegistry: true,
            });

            expect(mockResolveChainFromRegistry).toHaveBeenCalledWith("eth", "on.eth", undefined);
        });
    });

    describe("onchainRegistry disabled", () => {
        it("skips onchain when onchainRegistry is false", async () => {
            mockShortnameToChainId.mockResolvedValue(1);

            const result = await parseName("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eth", {
                onchainRegistry: false,
            });

            expect(mockResolveChainFromRegistry).not.toHaveBeenCalled();
            expect(mockShortnameToChainId).toHaveBeenCalledWith("eth");
            if (isTextAddress(result.interoperableAddress)) {
                expect(result.interoperableAddress.chainType).toBe("eip155");
                expect(result.interoperableAddress.chainReference).toBe("1");
            }
        });
    });

    describe("offchainRegistryFallback disabled", () => {
        it("does not fall back to offchain when disabled", async () => {
            mockResolveChainFromRegistry.mockResolvedValue(null);

            await expect(
                parseName("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eth", {
                    offchainRegistryFallback: false,
                }),
            ).rejects.toThrow();

            expect(mockResolveChainFromRegistry).toHaveBeenCalledWith("eth", "on.eth", undefined);
            expect(mockShortnameToChainId).not.toHaveBeenCalled();
        });
    });

    describe("both registries disabled", () => {
        it("throws when shortname is used with both registries off", async () => {
            await expect(
                parseName("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eth", {
                    onchainRegistry: false,
                    offchainRegistryFallback: false,
                }),
            ).rejects.toThrow();

            expect(mockResolveChainFromRegistry).not.toHaveBeenCalled();
            expect(mockShortnameToChainId).not.toHaveBeenCalled();
        });

        it("works with fully-qualified CAIP-2 even with both registries off", async () => {
            const result = await parseName("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:10", {
                onchainRegistry: false,
                offchainRegistryFallback: false,
            });

            expect(mockResolveChainFromRegistry).not.toHaveBeenCalled();
            expect(mockShortnameToChainId).not.toHaveBeenCalled();
            if (isTextAddress(result.interoperableAddress)) {
                expect(result.interoperableAddress.chainType).toBe("eip155");
                expect(result.interoperableAddress.chainReference).toBe("10");
            }
        });
    });

    describe("rpcUrl option", () => {
        it("passes rpcUrl to resolveChainFromRegistry", async () => {
            mockResolveChainFromRegistry.mockResolvedValue({
                chainType: "eip155",
                chainReference: "1",
            });

            await parseName("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eth", {
                rpcUrl: "https://custom-rpc.com",
            });

            expect(mockResolveChainFromRegistry).toHaveBeenCalledWith(
                "eth",
                "on.eth",
                "https://custom-rpc.com",
            );
        });
    });

    describe("when chainType is explicitly provided", () => {
        it("does not use registry (explicit chain takes precedence)", async () => {
            const result = await parseName("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1");

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

            const result = await parseName("vitalik.eth@eth");

            expect(mockResolveChainFromRegistry).toHaveBeenCalledWith("eth", "on.eth", undefined);
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

            const result = await parseName("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eth");

            // Checksum should be calculated based on resolved chain
            expect(result.meta.checksum).toBeDefined();
            expect(typeof result.meta.checksum).toBe("string");
            expect(result.meta.checksum?.length).toBe(8);
        });

        it("preserves other options like representation", async () => {
            mockResolveChainFromRegistry.mockResolvedValue({
                chainType: "eip155",
                chainReference: "1",
            });

            const result = await parseName("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eth", {
                representation: "binary",
            });

            expect(result.interoperableAddress.chainType instanceof Uint8Array).toBe(true);
        });
    });
});
