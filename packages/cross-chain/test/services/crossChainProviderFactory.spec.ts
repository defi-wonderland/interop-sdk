import type { Address, PublicClient } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    AcrossProvider,
    CrossChainProvider,
    SampleProvider,
    UnsupportedProtocol,
} from "../../src/internal.js";
import {
    createCrossChainProvider,
    CrossChainProviderFactory,
} from "../../src/services/crossChainProviderFactory.js";

const config = {
    userAddress: "0x123" as Address,
} as const;

const dependencies = {
    publicClient: {} as PublicClient,
} as const;

describe("CrossChainProviderFactory", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("builds a CrossChainProvider", () => {
        const provider = CrossChainProviderFactory.build("across", config, dependencies);

        expect(provider).toBeInstanceOf(CrossChainProvider);
    });

    it("builds a CrossChainProvider with the across provider", () => {
        const provider = CrossChainProviderFactory.build(
            "across",
            config,
            dependencies,
        ) as AcrossProvider;

        expect(provider).toBeInstanceOf(AcrossProvider);
        expect(provider["publicClient"]).toEqual(dependencies.publicClient);
    });

    it("builds a CrossChainProvider with the sample provider", () => {
        const provider = CrossChainProviderFactory.build(
            "sample-protocol",
            undefined,
            undefined,
        ) as SampleProvider;

        expect(provider).toBeInstanceOf(SampleProvider);
    });

    it("creates a cross chain provider using the createCrossChainProvider function", () => {
        const provider = createCrossChainProvider("across", config, dependencies) as AcrossProvider;

        expect(provider).toBeInstanceOf(AcrossProvider);
        expect(provider["publicClient"]).toEqual(dependencies.publicClient);
    });

    it("throws an UnsupportedProtocol error for unsupported protocols", () => {
        expect(() => {
            // @ts-expect-error - This is a test
            CrossChainProviderFactory.build("unsupported-protocol", undefined, undefined);
        }).toThrow(UnsupportedProtocol);
    });
});
