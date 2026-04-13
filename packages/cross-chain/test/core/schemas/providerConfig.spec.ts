import { describe, expect, it } from "vitest";

import {
    FEE_CONFIG_REFINEMENT_ERROR,
    feeConfigRefinement,
    FeeConfigSchema,
    SubmissionModesSchema,
} from "../../../src/core/schemas/providerConfig.js";

describe("FeeConfigSchema", () => {
    it("accepts empty config", () => {
        const result = FeeConfigSchema.parse({});
        expect(result).toEqual({});
    });

    it("accepts feeBps and feeTakerAddress together", () => {
        const result = FeeConfigSchema.parse({
            feeBps: "50",
            feeTakerAddress: "0x1234",
        });
        expect(result.feeBps).toBe("50");
        expect(result.feeTakerAddress).toBe("0x1234");
    });

    it("accepts feeBps without feeTakerAddress at schema level", () => {
        const result = FeeConfigSchema.parse({ feeBps: "50" });
        expect(result.feeBps).toBe("50");
        expect(result.feeTakerAddress).toBeUndefined();
    });
});

describe("feeConfigRefinement", () => {
    it("returns true when no feeBps is set", () => {
        expect(feeConfigRefinement({})).toBe(true);
    });

    it("returns true when both feeBps and feeTakerAddress are set", () => {
        expect(feeConfigRefinement({ feeBps: "50", feeTakerAddress: "0x1234" })).toBe(true);
    });

    it("returns false when feeBps is set without feeTakerAddress", () => {
        expect(feeConfigRefinement({ feeBps: "50" })).toBe(false);
    });

    it("provides correct error metadata", () => {
        expect(FEE_CONFIG_REFINEMENT_ERROR.path).toEqual(["feeTakerAddress"]);
        expect(FEE_CONFIG_REFINEMENT_ERROR.message).toContain("feeTakerAddress");
    });
});

describe("SubmissionModesSchema", () => {
    it("accepts an array of valid modes", () => {
        const result = SubmissionModesSchema.parse(["user-transaction", "gasless"]);
        expect(result).toEqual(["user-transaction", "gasless"]);
    });

    it("accepts undefined", () => {
        expect(SubmissionModesSchema.parse(undefined)).toBeUndefined();
    });

    it("rejects array with invalid values", () => {
        expect(() => SubmissionModesSchema.parse(["invalid"])).toThrow();
    });
});
