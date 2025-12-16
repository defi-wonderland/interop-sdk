import { beforeEach, describe, expect, it, vi } from "vitest";

import { AcrossProvider, IntentTracker, IntentTrackerFactory } from "../../src/external.js";
import { DepositInfoParser, FillWatcher } from "../../src/internal.js";

const MOCK_API_URL = "https://mocked.across.url/api";
const MOCK_PROVIDER_ID = "across";

describe("IntentTrackerFactory", () => {
    describe("constructor", () => {
        it("creates a factory instance with default config", () => {
            const factory = new IntentTrackerFactory();

            expect(factory).toBeInstanceOf(IntentTrackerFactory);
        });

        it("creates a factory instance with custom RPC URLs", () => {
            const factory = new IntentTrackerFactory({
                rpcUrls: {
                    11155111: "https://custom-sepolia.com",
                    84532: "https://custom-base.com",
                },
            });

            expect(factory).toBeInstanceOf(IntentTrackerFactory);
        });
    });

    describe("createTracker", () => {
        let factory: IntentTrackerFactory;
        let provider: AcrossProvider;

        beforeEach(() => {
            factory = new IntentTrackerFactory({
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

        it("creates an IntentTracker instance", () => {
            const tracker = factory.createTracker(provider);

            expect(tracker).toBeInstanceOf(IntentTracker);
        });

        it("creates different tracker instances for each call", () => {
            const tracker1 = factory.createTracker(provider);
            const tracker2 = factory.createTracker(provider);

            expect(tracker1).not.toBe(tracker2);
        });

        it("accepts custom depositInfoParser", () => {
            const mockDepositInfoParser: DepositInfoParser = {
                getDepositInfo: vi.fn(),
            };

            const tracker = factory.createTracker(provider, {
                depositInfoParser: mockDepositInfoParser,
            });

            expect(tracker).toBeInstanceOf(IntentTracker);
        });

        it("accepts custom fillWatcher", () => {
            const mockFillWatcher: FillWatcher = {
                getFill: vi.fn(),
                waitForFill: vi.fn(),
            };

            const tracker = factory.createTracker(provider, {
                fillWatcher: mockFillWatcher,
            });

            expect(tracker).toBeInstanceOf(IntentTracker);
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

            expect(trackerA).toBeInstanceOf(IntentTracker);
            expect(trackerB).toBeInstanceOf(IntentTracker);
            expect(trackerA).not.toBe(trackerB);
        });
    });
});
