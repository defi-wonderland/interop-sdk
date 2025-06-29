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

describe("CrossChainProviderFactory", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("builds a CrossChainProvider", () => {
        const provider = CrossChainProviderFactory.build("across");

        expect(provider).toBeInstanceOf(CrossChainProvider);
    });

    it("builds a CrossChainProvider with the across provider", () => {
        const provider = CrossChainProviderFactory.build("across") as AcrossProvider;

        expect(provider).toBeInstanceOf(AcrossProvider);
    });

    it("builds a CrossChainProvider with the sample provider", () => {
        const provider = CrossChainProviderFactory.build("sample-protocol") as SampleProvider;

        expect(provider).toBeInstanceOf(SampleProvider);
    });

    it("creates a cross chain provider using the createCrossChainProvider function", () => {
        const provider = createCrossChainProvider("across") as AcrossProvider;

        expect(provider).toBeInstanceOf(AcrossProvider);
    });

    it("throws an UnsupportedProtocol error for unsupported protocols", () => {
        expect(() => {
            // @ts-expect-error - This is a test
            CrossChainProviderFactory.build("unsupported-protocol");
        }).toThrow(UnsupportedProtocol);
    });
});
