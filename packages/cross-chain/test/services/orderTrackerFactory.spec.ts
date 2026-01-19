import { beforeEach, describe, expect, it, vi } from "vitest";

import { AcrossProvider, OrderTracker, OrderTrackerFactory } from "../../src/external.js";
import { FillWatcher, OpenedIntentParser } from "../../src/internal.js";

const MOCK_API_URL = "https://mocked.across.url/api";
const MOCK_PROVIDER_ID = "across";

describe("OrderTrackerFactory", () => {
    describe("constructor", () => {
        it("creates a factory instance with default config", () => {
            const factory = new OrderTrackerFactory();

            expect(factory).toBeInstanceOf(OrderTrackerFactory);
        });

        it("creates a factory instance with custom RPC URLs", () => {
            const factory = new OrderTrackerFactory({
                rpcUrls: {
                    11155111: "https://custom-sepolia.com",
                    84532: "https://custom-base.com",
                },
            });

            expect(factory).toBeInstanceOf(OrderTrackerFactory);
        });
    });

    describe("createTracker", () => {
        let factory: OrderTrackerFactory;
        let provider: AcrossProvider;

        beforeEach(() => {
            factory = new OrderTrackerFactory({
                rpcUrls: {
                    11155111: "https://sepolia.com",
                    84532: "https://base.com",
                },
            });

            provider = new AcrossProvider({
                apiUrl: MOCK_API_URL,
                providerId: MOCK_PROVIDER_ID,
            });
        });

        it("creates an OrderTracker instance", () => {
            const tracker = factory.createTracker(provider);

            expect(tracker).toBeInstanceOf(OrderTracker);
        });

        it("creates different tracker instances for each call", () => {
            const tracker1 = factory.createTracker(provider);
            const tracker2 = factory.createTracker(provider);

            expect(tracker1).not.toBe(tracker2);
        });

        it("accepts custom openedIntentParser", () => {
            const mockOpenedIntentParser: OpenedIntentParser = {
                getOpenedIntent: vi.fn(),
            };

            const tracker = factory.createTracker(provider, {
                openedIntentParser: mockOpenedIntentParser,
            });

            expect(tracker).toBeInstanceOf(OrderTracker);
        });

        it("accepts custom fillWatcher", () => {
            const mockFillWatcher: FillWatcher = {
                getFill: vi.fn(),
                waitForFill: vi.fn(),
            };

            const tracker = factory.createTracker(provider, {
                fillWatcher: mockFillWatcher,
            });

            expect(tracker).toBeInstanceOf(OrderTracker);
        });

        it("creates unique trackers for different providers", () => {
            const providerA = new AcrossProvider({
                apiUrl: MOCK_API_URL,
                providerId: "across-a",
            });

            const providerB = new AcrossProvider({
                apiUrl: MOCK_API_URL,
                providerId: "across-b",
            });

            const trackerA = factory.createTracker(providerA);
            const trackerB = factory.createTracker(providerB);

            expect(trackerA).toBeInstanceOf(OrderTracker);
            expect(trackerB).toBeInstanceOf(OrderTracker);
            expect(trackerA).not.toBe(trackerB);
        });
    });
});
