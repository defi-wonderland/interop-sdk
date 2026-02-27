import { beforeEach, describe, expect, it, vi } from "vitest";

import { createCrossChainProvider } from "../../src/factories/crossChainProviderFactory.js";
import {
    AcrossProvider,
    CrossChainProvider,
    RelayProvider,
    UnsupportedProtocol,
} from "../../src/internal.js";

const MOCK_ACROSS_CONFIG = {
    apiUrl: "https://across.to/api",
    providerId: "test-across-provider",
};

const MOCK_RELAY_CONFIG = {
    apiUrl: "https://relay.link/api",
    providerId: "test-relay-provider",
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

    it("creates a CrossChainProvider with the relay provider", () => {
        const provider = createCrossChainProvider("relay", MOCK_RELAY_CONFIG);

        expect(provider).toBeInstanceOf(RelayProvider);
    });

    it("creates a relay provider without config (defaults to mainnet)", () => {
        const provider = createCrossChainProvider("relay");

        expect(provider).toBeInstanceOf(RelayProvider);
    });

    it("throws an UnsupportedProtocol error for unsupported protocols", () => {
        expect(() => {
            // @ts-expect-error - Testing unsupported protocol
            createCrossChainProvider("unsupported-protocol", {});
        }).toThrow(UnsupportedProtocol);
    });
});
