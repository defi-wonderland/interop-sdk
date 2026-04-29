import { describe, expect, it } from "vitest";

import { EtaResolverService } from "../../../src/core/services/etaResolver.js";

const NOW = 1_700_000_000;
const fixedClock = (): number => NOW;

describe("EtaResolverService", () => {
    const service = new EtaResolverService(fixedClock);

    it("returns the provider eta when defined", () => {
        expect(service.resolve(120, [NOW + 600])).toBe(120);
    });

    it("treats provider eta of 0 as a valid instant fill", () => {
        expect(service.resolve(0, [NOW + 600])).toBe(0);
    });

    it("falls back to the first defined deadline when provider eta is missing", () => {
        expect(service.resolve(undefined, [undefined, NOW + 300])).toBe(300);
    });

    it("clamps deadlines in the past to 0", () => {
        expect(service.resolve(undefined, [NOW - 100])).toBe(0);
    });

    it("returns undefined when no provider eta and no deadlines are available", () => {
        expect(service.resolve(undefined, [])).toBeUndefined();
        expect(service.resolve(undefined, [undefined, undefined])).toBeUndefined();
    });

    it("ignores negative provider eta and falls through to deadlines", () => {
        expect(service.resolve(-1, [NOW + 200])).toBe(200);
    });

    it("rejects NaN inputs and falls through cleanly", () => {
        expect(service.resolve(NaN, [NOW + 200])).toBe(200);
        expect(service.resolve(undefined, [NaN, NOW + 200])).toBe(200);
        expect(service.resolve(NaN, [NaN])).toBeUndefined();
    });

    it("rejects Infinity inputs", () => {
        expect(service.resolve(Infinity, [NOW + 200])).toBe(200);
        expect(service.resolve(undefined, [Infinity, NOW + 200])).toBe(200);
    });

    it("uses the injected clock for deterministic computations", () => {
        const customClock = (): number => 2_000_000_000;
        const customService = new EtaResolverService(customClock);
        expect(customService.resolve(undefined, [2_000_000_500])).toBe(500);
    });

    it("defaults to the wall clock when none is provided", () => {
        const defaultService = new EtaResolverService();
        const futureDeadline = Math.floor(Date.now() / 1000) + 1000;
        const result = defaultService.resolve(undefined, [futureDeadline]);
        expect(result).toBeGreaterThan(0);
        expect(result).toBeLessThanOrEqual(1000);
    });
});
