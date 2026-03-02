import { beforeEach, describe, expect, it, vi } from "vitest";

import { createCrossChainProvider } from "../../src/factories/crossChainProviderFactory.js";
import { AcrossProvider, CrossChainProvider, UnsupportedProtocol } from "../../src/internal.js";

const MOCK_ACROSS_CONFIG = {
    apiUrl: "https://across.to/api",
    providerId: "test-across-provider",
};

describe("createCrossChainProvider", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("creates a CrossChainProvider", () => {
        const provider = createCrossChainProvider("across", MOCK_ACROSS_CONFIG);

        expect(provider).toBeInstanceOf(CrossChainProvider);
    });

    it("creates a CrossChainProvider with the across provider", () => {
        const provider = createCrossChainProvider("across", MOCK_ACROSS_CONFIG);

        expect(provider).toBeInstanceOf(AcrossProvider);
    });

    it("creates an across provider without config (defaults to mainnet)", () => {
        const provider = createCrossChainProvider("across");

        expect(provider).toBeInstanceOf(AcrossProvider);
    });

    it("throws an UnsupportedProtocol error for unsupported protocols", () => {
        expect(() => {
            // @ts-expect-error - Testing unsupported protocol
            createCrossChainProvider("unsupported-protocol", {});
        }).toThrow(UnsupportedProtocol);
    });
});
