import type { Address } from "viem";
import { arbitrum, base, mainnet, optimism } from "viem/chains";
import { describe, expect, it } from "vitest";

import type { SameAssetMap } from "../../src/external.js";
import { createSameAssetService } from "../../src/external.js";
import { DefaultSameAssetService } from "../../src/internal.js";

const NATIVE_EEE = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" as Address;
const NATIVE_ZERO = "0x0000000000000000000000000000000000000000" as Address;

const USDC_MAINNET = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as Address;
const USDC_OPTIMISM = "0x7F5c764cBc14f9669B88837ca1490cCa17c31607" as Address;
const USDC_ARBITRUM = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as Address;
const ATTACKER = "0x000000000000000000000000000000000000dEaD" as Address;

const USDC_MAP: SameAssetMap = {
    USDC: {
        [mainnet.id]: USDC_MAINNET,
        [optimism.id]: USDC_OPTIMISM,
        [arbitrum.id]: USDC_ARBITRUM,
    },
};

describe("DefaultSameAssetService", () => {
    const service = new DefaultSameAssetService(USDC_MAP);

    it("resolves the same id for one asset across chains", () => {
        expect(service.resolve(mainnet.id, USDC_MAINNET)).toBe("USDC");
        expect(service.resolve(optimism.id, USDC_OPTIMISM)).toBe("USDC");
        expect(service.resolve(arbitrum.id, USDC_ARBITRUM)).toBe("USDC");
    });

    it("returns undefined for an address it does not list", () => {
        expect(service.resolve(arbitrum.id, ATTACKER)).toBeUndefined();
    });

    it("returns undefined for a chain it does not list", () => {
        expect(service.resolve(base.id, USDC_MAINNET)).toBeUndefined();
    });

    it("resolves regardless of address casing", () => {
        expect(service.resolve(mainnet.id, USDC_MAINNET.toUpperCase() as Address)).toBe("USDC");
        expect(service.resolve(mainnet.id, USDC_MAINNET.toLowerCase() as Address)).toBe("USDC");
    });

    it("collapses native placeholder variants to a single id", () => {
        const native = new DefaultSameAssetService({
            ETH: { [mainnet.id]: NATIVE_EEE, [optimism.id]: NATIVE_ZERO },
        });
        expect(native.resolve(mainnet.id, NATIVE_ZERO)).toBe("ETH");
        expect(native.resolve(optimism.id, NATIVE_EEE)).toBe("ETH");
    });

    it("keeps distinct assets distinct", () => {
        const map = new DefaultSameAssetService({
            USDC: { [mainnet.id]: USDC_MAINNET },
            DAI: { [mainnet.id]: ATTACKER },
        });
        expect(map.resolve(mainnet.id, USDC_MAINNET)).toBe("USDC");
        expect(map.resolve(mainnet.id, ATTACKER)).toBe("DAI");
    });
});

describe("createSameAssetService", () => {
    it("builds a service where same-asset legs share an id", () => {
        const service = createSameAssetService(USDC_MAP);
        expect(service.resolve(mainnet.id, USDC_MAINNET)).toBe(
            service.resolve(arbitrum.id, USDC_ARBITRUM),
        );
    });

    it("rejects an empty map", () => {
        expect(() => createSameAssetService({})).toThrow();
    });

    it("rejects an invalid token address", () => {
        expect(() =>
            createSameAssetService({ USDC: { [mainnet.id]: "not-an-address" as Address } }),
        ).toThrow();
    });

    it("rejects a non-numeric chain id", () => {
        expect(() =>
            createSameAssetService({ USDC: { ["mainnet" as unknown as number]: USDC_MAINNET } }),
        ).toThrow();
    });
});
