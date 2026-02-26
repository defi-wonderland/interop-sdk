import { toChainIdentifier } from "@wonderland/interop-addresses";
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
    submitOrder = vi.fn();
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
    submitOrder = vi.fn();
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
                submitOrder = vi.fn();
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

        it("should create CustomApiAssetDiscoveryService for custom-api config", () => {
            const factory = new AssetDiscoveryFactory();

            class CustomApiProvider extends CrossChainProvider {
                readonly protocolName = "custom";
                readonly providerId = "custom-provider";
                getQuotes = vi.fn();
                submitOrder = vi.fn();
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

            const service = factory.createService(provider);
            expect(service).not.toBeNull();
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

            // Verify it returns DiscoveredAssets
            const result = await service.getSupportedAssets();
            expect(Object.keys(result.tokensByChain)).toContain(toChainIdentifier(1));
            expect(Object.keys(result.tokensByChain)).toContain(toChainIdentifier(137));
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

    it("should return DiscoveredAssets", async () => {
        const result = await service.getSupportedAssets();

        expect(Object.keys(result.tokensByChain)).toHaveLength(1);
        expect(Object.keys(result.tokensByChain)).toContain(toChainIdentifier(1));
        expect(result.tokensByChain[toChainIdentifier(1) as string]).toHaveLength(2);
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

describe("Static Asset Discovery Service with AssetDiscoveryOptions", () => {
    const multiChainNetworks: NetworkAssets[] = [
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
        {
            chainId: 42161,
            assets: [
                {
                    address: "0x0001000000a5af449f9385dc8d884c99e6836a3fae51acad7f0d9fe9",
                    symbol: "USDC",
                    decimals: 6,
                },
            ],
        },
    ];

    let service: AssetDiscoveryService;

    beforeEach(() => {
        const factory = new AssetDiscoveryFactory();
        service = factory.createServiceFromConfig(
            { type: "static", config: { networks: multiChainNetworks } },
            "test-provider",
        );
    });

    describe("getSupportedAssets with options", () => {
        it("should return all chains when no chainIds filter is provided", async () => {
            const result = await service.getSupportedAssets();

            expect(Object.keys(result.tokensByChain)).toHaveLength(3);
            expect(Object.keys(result.tokensByChain)).toContain(toChainIdentifier(1));
            expect(Object.keys(result.tokensByChain)).toContain(toChainIdentifier(137));
            expect(Object.keys(result.tokensByChain)).toContain(toChainIdentifier(42161));
        });

        it("should filter by chainIds when provided", async () => {
            const result = await service.getSupportedAssets({ chainIds: [1, 42161] });

            expect(Object.keys(result.tokensByChain)).toHaveLength(2);
            expect(Object.keys(result.tokensByChain)).toContain(toChainIdentifier(1));
            expect(Object.keys(result.tokensByChain)).toContain(toChainIdentifier(42161));
        });

        it("should return empty when chainIds filter matches nothing", async () => {
            const result = await service.getSupportedAssets({ chainIds: [999] });

            expect(Object.keys(result.tokensByChain)).toHaveLength(0);
        });

        it("should return single chain when chainIds has one matching ID", async () => {
            const result = await service.getSupportedAssets({ chainIds: [137] });

            expect(Object.keys(result.tokensByChain)).toHaveLength(1);
            expect(Object.keys(result.tokensByChain)).toContain(toChainIdentifier(137));
        });

        it("should include tokenMetadata in filtered result", async () => {
            const result = await service.getSupportedAssets({ chainIds: [1] });

            expect(Object.keys(result.tokenMetadata).length).toBeGreaterThan(0);
        });
    });

    describe("getSupportedChainIds with options", () => {
        it("should return all chain IDs when no chainIds filter is provided", async () => {
            const result = await service.getSupportedChainIds();

            expect(result).toEqual([1, 137, 42161]);
        });

        it("should filter chain IDs by chainIds when provided", async () => {
            const result = await service.getSupportedChainIds({ chainIds: [1, 137] });

            expect(result).toEqual([1, 137]);
        });

        it("should return empty array when chainIds filter matches nothing", async () => {
            const result = await service.getSupportedChainIds({ chainIds: [999] });

            expect(result).toEqual([]);
        });

        it("should return single chain ID when chainIds has one matching ID", async () => {
            const result = await service.getSupportedChainIds({ chainIds: [42161] });

            expect(result).toEqual([42161]);
        });
    });
});
