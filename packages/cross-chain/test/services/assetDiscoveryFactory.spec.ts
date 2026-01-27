import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    AssetDiscoveryFactory,
    AssetDiscoveryService,
    createAssetDiscoveryService,
    CrossChainProvider,
    CustomApiAssetDiscoveryConfig,
    NetworkAssets,
    OIFAssetDiscoveryConfig,
    StaticAssetDiscoveryConfig,
} from "../../src/internal.js";

// Mock provider that supports discovery
class MockDiscoveryProvider extends CrossChainProvider {
    readonly protocolName = "mock";
    readonly providerId = "mock-provider";

    getQuotes = vi.fn();
    submitSignedOrder = vi.fn();
    getTrackingConfig = vi.fn();

    override getDiscoveryConfig(): StaticAssetDiscoveryConfig {
        return { type: "static" as const, config: { networks: this.mockNetworks } };
    }

    constructor(private mockNetworks: NetworkAssets[] = []) {
        super();
    }
}

// Mock provider that doesn't support discovery
class MockNoDiscoveryProvider extends CrossChainProvider {
    readonly protocolName = "mock-no-discovery";
    readonly providerId = "mock-no-discovery-provider";

    getQuotes = vi.fn();
    submitSignedOrder = vi.fn();
    getTrackingConfig = vi.fn();
    // Uses default getDiscoveryConfig which returns null
}

describe("AssetDiscoveryFactory", () => {
    const mockNetworks: NetworkAssets[] = [
        {
            chainId: 1,
            assets: [
                {
                    address: "0x000100000101A0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                    symbol: "USDC",
                    decimals: 6,
                },
            ],
        },
        {
            chainId: 137,
            assets: [
                {
                    address: "0x00010000018902791Bca1f2de4661ED88A30C99A7a9449Aa84174",
                    symbol: "USDC",
                    decimals: 6,
                },
            ],
        },
    ];

    describe("createService", () => {
        it("should return null for providers that don't support discovery", () => {
            const factory = new AssetDiscoveryFactory();
            const provider = new MockNoDiscoveryProvider();

            const service = factory.createService(provider);

            expect(service).toBeNull();
        });

        it("should create static service for static config", () => {
            const factory = new AssetDiscoveryFactory();
            const provider = new MockDiscoveryProvider(mockNetworks);

            const service = factory.createService(provider);

            expect(service).not.toBeNull();
        });

        it("should create OIF service for OIF config with URL", () => {
            const factory = new AssetDiscoveryFactory();

            // Create a provider that returns OIF config with URL
            class OifConfigProvider extends CrossChainProvider {
                readonly protocolName = "oif-mock";
                readonly providerId = "oif-mock-provider";
                getQuotes = vi.fn();
                submitSignedOrder = vi.fn();
                getTrackingConfig = vi.fn();
                override getDiscoveryConfig(): OIFAssetDiscoveryConfig {
                    return {
                        type: "oif" as const,
                        config: {
                            baseUrl: "https://api.solver.test",
                        },
                    };
                }
            }

            const provider = new OifConfigProvider();

            // OIF config with URL should work
            const service = factory.createService(provider);
            expect(service).not.toBeNull();
        });

        it("should pass factory defaultCacheTtl to OIF service", () => {
            const factory = new AssetDiscoveryFactory({ defaultCacheTtl: 60000 });

            class OifConfigProvider extends CrossChainProvider {
                readonly protocolName = "oif-mock";
                readonly providerId = "oif-mock-provider";
                getQuotes = vi.fn();
                submitSignedOrder = vi.fn();
                getTrackingConfig = vi.fn();
                override getDiscoveryConfig(): OIFAssetDiscoveryConfig {
                    return {
                        type: "oif" as const,
                        config: {
                            baseUrl: "https://api.solver.test",
                            // No cacheTtl - should use factory default
                        },
                    };
                }
            }

            const provider = new OifConfigProvider();
            const service = factory.createService(provider);

            // Service should be created (we can't easily verify the TTL without exposing it)
            expect(service).not.toBeNull();
        });

        it("should throw for custom-api config (not yet implemented)", () => {
            const factory = new AssetDiscoveryFactory();

            class CustomApiProvider extends CrossChainProvider {
                readonly protocolName = "custom";
                readonly providerId = "custom-provider";
                getQuotes = vi.fn();
                submitSignedOrder = vi.fn();
                getTrackingConfig = vi.fn();
                override getDiscoveryConfig(): CustomApiAssetDiscoveryConfig {
                    return {
                        type: "custom-api" as const,
                        config: {
                            assetsEndpoint: "https://api.test.com/assets",
                            parseResponse: () => [],
                        },
                    };
                }
            }

            const provider = new CustomApiProvider();

            expect(() => factory.createService(provider)).toThrow("not yet implemented");
        });
    });

    describe("createServiceFromConfig", () => {
        it("should create static service from static config", async () => {
            const factory = new AssetDiscoveryFactory();
            const config: StaticAssetDiscoveryConfig = {
                type: "static",
                config: { networks: mockNetworks },
            };

            const service = factory.createServiceFromConfig(config, "test-provider");

            expect(service).not.toBeNull();

            // Verify it returns the static data
            const result = await service.getSupportedAssets();
            expect(result.networks).toEqual(mockNetworks);
            expect(result.providerId).toBe("test-provider");
        });
    });
});

describe("Static Asset Discovery Service", () => {
    const mockNetworks: NetworkAssets[] = [
        {
            chainId: 1,
            assets: [
                {
                    address: "0x000100000101A0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                    symbol: "USDC",
                    decimals: 6,
                },
                {
                    address: "0x000100000101C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
                    symbol: "WETH",
                    decimals: 18,
                },
            ],
        },
    ];

    let service: AssetDiscoveryService;

    beforeEach(() => {
        const factory = new AssetDiscoveryFactory();
        service = factory.createServiceFromConfig(
            { type: "static", config: { networks: mockNetworks } },
            "test-provider",
        );
    });

    it("should return all supported assets", async () => {
        const result = await service.getSupportedAssets();

        expect(result.networks).toHaveLength(1);
        expect(result.networks[0]?.chainId).toBe(1);
        expect(result.networks[0]?.assets).toHaveLength(2);
    });

    it("should return assets for a specific chain", async () => {
        const result = await service.getAssetsForChain(1);

        expect(result).not.toBeNull();
        expect(result?.assets).toHaveLength(2);
    });

    it("should return null for unsupported chain", async () => {
        const result = await service.getAssetsForChain(999);

        expect(result).toBeNull();
    });

    it("should check if asset is supported", async () => {
        const result = await service.isAssetSupported(
            1,
            "0x000100000101A0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        );

        expect(result).not.toBeNull();
        expect(result?.symbol).toBe("USDC");
    });

    it("should return null for unsupported asset", async () => {
        const result = await service.isAssetSupported(
            1,
            "0x0001000001010000000000000000000000000000000000000000",
        );

        expect(result).toBeNull();
    });

    it("should return supported chain IDs", async () => {
        const result = await service.getSupportedChainIds();

        expect(result).toEqual([1]);
    });
});

describe("createAssetDiscoveryService helper", () => {
    it("should return null for providers without discovery support", () => {
        const provider = new MockNoDiscoveryProvider();
        const service = createAssetDiscoveryService(provider);

        expect(service).toBeNull();
    });

    it("should create service for providers with discovery support", () => {
        const provider = new MockDiscoveryProvider([
            {
                chainId: 1,
                assets: [],
            },
        ]);
        const service = createAssetDiscoveryService(provider);

        expect(service).not.toBeNull();
    });
});
