import type viem from "viem";
import { createPublicClient, http, HttpTransport, PublicClient } from "viem";
import { baseSepolia, sepolia } from "viem/chains";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PublicClientManager } from "../../src/utils/publicClientManager.js";

vi.mock("viem", async () => {
    return {
        ...(await vi.importActual<typeof viem>("viem")),
        createPublicClient: vi.fn(),
        http: vi.fn(),
    };
});

describe("PublicClientManager", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("getClient", () => {
        it("should return the custom client if provided", () => {
            const customClient = {} as PublicClient;
            const manager = new PublicClientManager(customClient);

            const result = manager.getClient(sepolia);

            expect(result).toBe(customClient);
            expect(createPublicClient).not.toHaveBeenCalled();
        });

        it("should create and cache client for a chain", () => {
            const mockClient = {} as PublicClient;
            const mockTransport = (() => ({})) as unknown as HttpTransport;
            vi.mocked(createPublicClient).mockReturnValue(mockClient);
            vi.mocked(http).mockReturnValue(mockTransport);

            const manager = new PublicClientManager();

            const result = manager.getClient(sepolia);

            expect(result).toBe(mockClient);
            expect(createPublicClient).toHaveBeenCalledTimes(1);
            expect(http).toHaveBeenCalledWith(undefined); // No custom RPC URL
            expect(createPublicClient).toHaveBeenCalledWith({
                chain: sepolia,
                transport: mockTransport,
            });
        });

        it("should return cached client on subsequent calls for same chain", () => {
            const mockClient = {} as PublicClient;
            vi.mocked(createPublicClient).mockReturnValue(mockClient);

            const manager = new PublicClientManager();

            const result1 = manager.getClient(sepolia);
            const result2 = manager.getClient(sepolia);
            const result3 = manager.getClient(sepolia);

            expect(result1).toBe(mockClient);
            expect(result2).toBe(mockClient);
            expect(result3).toBe(mockClient);
            expect(createPublicClient).toHaveBeenCalledTimes(1); // Only called once
        });

        it("should create separate clients for different chains", () => {
            const mockSepoliaClient = { name: "sepolia" } as unknown as PublicClient;
            const mockBaseClient = { name: "base" } as unknown as PublicClient;

            vi.mocked(createPublicClient)
                .mockReturnValueOnce(mockSepoliaClient)
                .mockReturnValueOnce(mockBaseClient);

            const manager = new PublicClientManager();

            const sepoliaClient = manager.getClient(sepolia);
            const baseClient = manager.getClient(baseSepolia);

            expect(sepoliaClient).toBe(mockSepoliaClient);
            expect(baseClient).toBe(mockBaseClient);
            expect(createPublicClient).toHaveBeenCalledTimes(2);
        });

        it("should use custom RPC URL when provided", () => {
            const customRpcUrls = {
                [sepolia.id]: "https://custom-sepolia-rpc.example.com",
            };

            const mockClient = {} as PublicClient;
            const mockTransport = (() => ({})) as unknown as HttpTransport;
            vi.mocked(createPublicClient).mockReturnValue(mockClient);
            vi.mocked(http).mockReturnValue(mockTransport);

            const manager = new PublicClientManager(undefined, customRpcUrls);

            manager.getClient(sepolia);

            expect(http).toHaveBeenCalledWith("https://custom-sepolia-rpc.example.com");
        });

        it("should use chain default RPC when no custom URL provided", () => {
            const mockClient = {} as PublicClient;
            const mockTransport = (() => ({})) as unknown as HttpTransport;
            vi.mocked(createPublicClient).mockReturnValue(mockClient);
            vi.mocked(http).mockReturnValue(mockTransport);

            const manager = new PublicClientManager();

            manager.getClient(sepolia);

            // http() called with undefined uses viem's chain default
            expect(http).toHaveBeenCalledWith(undefined);
        });

        it("should prefer custom client over custom RPC URLs", () => {
            const customClient = {} as PublicClient;
            const customRpcUrls = {
                [sepolia.id]: "https://should-not-use.example.com",
            };

            const manager = new PublicClientManager(customClient, customRpcUrls);

            const result = manager.getClient(sepolia);

            expect(result).toBe(customClient);
            expect(createPublicClient).not.toHaveBeenCalled();
            expect(http).not.toHaveBeenCalled();
        });

        it("should cache clients independently per chain ID", () => {
            const mockClient1 = { id: 1 } as unknown as PublicClient;
            const mockClient2 = { id: 2 } as unknown as PublicClient;

            vi.mocked(createPublicClient)
                .mockReturnValueOnce(mockClient1)
                .mockReturnValueOnce(mockClient2);

            const manager = new PublicClientManager();

            // Get clients for two chains
            const client1a = manager.getClient(sepolia);
            const client2a = manager.getClient(baseSepolia);

            // Get them again
            const client1b = manager.getClient(sepolia);
            const client2b = manager.getClient(baseSepolia);

            // Each chain's client should be cached independently
            expect(client1a).toBe(client1b);
            expect(client2a).toBe(client2b);
            expect(client1a).not.toBe(client2a);
            expect(createPublicClient).toHaveBeenCalledTimes(2);
        });
    });
});
