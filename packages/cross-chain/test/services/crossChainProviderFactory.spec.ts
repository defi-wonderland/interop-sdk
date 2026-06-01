import { beforeEach, describe, expect, it, vi } from "vitest";

import { createCrossChainProvider } from "../../src/factories/crossChainProviderFactory.js";
import {
    AcrossProvider,
    BungeeProvider,
    CrossChainProvider,
    LifiIntentsProvider,
    OifProvider,
    RelayProvider,
    UnsupportedProtocol,
} from "../../src/internal.js";

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

    it("creates a RelayProvider with default config", () => {
        const provider = createCrossChainProvider("relay");

        expect(provider).toBeInstanceOf(RelayProvider);
    });

    it("creates a RelayProvider with custom config", () => {
        const provider = createCrossChainProvider("relay", { providerId: "relay-custom" });

        expect(provider).toBeInstanceOf(RelayProvider);
        expect(provider.providerId).toBe("relay-custom");
    });

    it("creates a BungeeProvider with default config", () => {
        const provider = createCrossChainProvider("bungee");

        expect(provider).toBeInstanceOf(BungeeProvider);
    });

    it("creates an OifProvider with required config", () => {
        const provider = createCrossChainProvider("oif", {
            solverId: "my-solver",
            url: "https://solver.example.com",
        });

        expect(provider).toBeInstanceOf(OifProvider);
    });

    it("creates a LifiIntentsProvider without config (defaults to the official order server)", () => {
        const provider = createCrossChainProvider("lifi-intents");

        expect(provider).toBeInstanceOf(LifiIntentsProvider);
    });

    it("creates a LifiIntentsProvider with config", () => {
        const provider = createCrossChainProvider("lifi-intents", {
            orderServerUrl: "https://order-server.example.com",
        });

        expect(provider).toBeInstanceOf(LifiIntentsProvider);
    });

    it("throws an UnsupportedProtocol error for unsupported protocols", () => {
        expect(() => {
            // @ts-expect-error - Testing unsupported protocol
            createCrossChainProvider("unsupported-protocol", {});
        }).toThrow(UnsupportedProtocol);
    });
});
