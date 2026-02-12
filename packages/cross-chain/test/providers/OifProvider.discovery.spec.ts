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

    /**
     * Skipped — OifProvider uses custom-api workaround until solver aligns GET /api/tokens with oif-specs.
     * Unskip when solver response matches spec and we revert to type: "oif".
     * @see https://github.com/openintentsframework/oif-solver/issues/295
     */
    describe.skip("getDiscoveryConfig", () => {
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
