import { describe, expect, it } from "vitest";

import { AssetDiscoveryFactory, OifProvider } from "../../src/internal.js";

describe("OifProvider - Asset Discovery", () => {
    const validConfig = {
        solverId: "test-solver",
        url: "https://api.solver.test",
    };

    const validConfigWithHeaders = {
        solverId: "test-solver",
        url: "https://api.solver.test",
        headers: { Authorization: "Bearer token" },
    };

    describe("getDiscoveryConfig", () => {
        it("should return OIF discovery config with base URL", () => {
            const provider = new OifProvider(validConfig);

            const config = provider.getDiscoveryConfig();

            expect(config).toEqual({
                type: "oif",
                config: {
                    baseUrl: "https://api.solver.test",
                    headers: undefined,
                },
            });
        });

        it("should include headers in discovery config when provided", () => {
            const provider = new OifProvider(validConfigWithHeaders);

            const config = provider.getDiscoveryConfig();

            expect(config).toEqual({
                type: "oif",
                config: {
                    baseUrl: "https://api.solver.test",
                    headers: { Authorization: "Bearer token" },
                },
            });
        });
    });

    describe("factory integration", () => {
        it("should allow factory to create service from OifProvider", () => {
            const provider = new OifProvider(validConfig);
            const factory = new AssetDiscoveryFactory();

            const service = factory.createService(provider);

            expect(service).not.toBeNull();
        });
    });
});
