import type { Address } from "viem";
import { arbitrum, base } from "viem/chains";
import { describe, expect, it } from "vitest";

import type { BuildQuoteRequest } from "../../src/core/schemas/quoteRequest.js";
import { InsufficientFee } from "../../src/core/errors/InsufficientFee.exception.js";
import { InvalidDeadline } from "../../src/core/errors/InvalidDeadline.exception.js";
import { UnsupportedAsset } from "../../src/core/errors/UnsupportedAsset.exception.js";
import { ZeroAmount } from "../../src/core/errors/ZeroAmount.exception.js";
import {
    MIN_DEADLINE_BUFFER_SECONDS,
    validateAssetSupport,
    validateBuildQuoteParams,
} from "../../src/core/validators/buildQuoteValidator.js";

const NOW = 1_700_000_000;

const USDC_MAINNET = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as Address;
const USDC_OPTIMISM = "0x7F5c764cBc14f9669B88837ca1490cCa17c31607" as Address;
const USDT_MAINNET = "0xdAC17F958D2ee523a2206206994597C13D831ec7" as Address;
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Address;
const USDC_ARBITRUM = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as Address;
const WETH_ARBITRUM = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1" as Address;

const KNOWN_TOKEN_METADATA = {
    [base.id]: {
        [USDC_BASE.toLowerCase()]: { symbol: "USDC" },
    },
    [arbitrum.id]: {
        [USDC_ARBITRUM.toLowerCase()]: { symbol: "USDC" },
        [WETH_ARBITRUM.toLowerCase()]: { symbol: "WETH" },
    },
};

function buildParams(overrides?: Partial<BuildQuoteRequest>): BuildQuoteRequest {
    return {
        user: "0x1234567890abcdef1234567890abcdef12345678",
        input: { chainId: 1, assetAddress: USDC_MAINNET, amount: "1000000" },
        output: { chainId: 10, assetAddress: USDC_OPTIMISM, amount: "990000" },
        escrowContractAddress: "0x5c7BCd6E7De5423a257D81B442095A1a6ced35C5",
        fillDeadline: NOW + 3600,
        ...overrides,
    };
}

function sameTokenParams(inputAmount: string, outputAmount: string): BuildQuoteRequest {
    return buildParams({
        input: { chainId: 1, assetAddress: USDC_MAINNET, amount: inputAmount },
        output: { chainId: 1, assetAddress: USDC_MAINNET, amount: outputAmount },
    });
}

const validate = (params: BuildQuoteRequest, metadata = {}): void =>
    validateBuildQuoteParams(params, metadata, NOW);

describe("validateBuildQuoteParams", () => {
    describe("zero amount", () => {
        it("rejects input amount '0'", () => {
            const params = buildParams({
                input: { chainId: 1, assetAddress: USDC_MAINNET, amount: "0" },
            });
            expect(() => validate(params)).toThrow(ZeroAmount);
            expect(() => validate(params)).toThrow("input.amount must be greater than zero");
        });

        it("rejects output amount '0'", () => {
            const params = buildParams({
                output: { chainId: 10, assetAddress: USDC_OPTIMISM, amount: "0" },
            });
            expect(() => validate(params)).toThrow(ZeroAmount);
            expect(() => validate(params)).toThrow("output.amount must be greater than zero");
        });

        it("accepts non-zero amounts", () => {
            expect(() => validate(buildParams())).not.toThrow();
        });
    });

    describe("fee margin", () => {
        it("rejects same-token output >= input (equal)", () => {
            expect(() => validate(sameTokenParams("1000000", "1000000"))).toThrow(InsufficientFee);
        });

        it("accepts same-token output < input", () => {
            expect(() => validate(sameTokenParams("1000000", "990000"))).not.toThrow();
        });

        it("skips check for different asset on same chain", () => {
            const params = buildParams({
                input: { chainId: 1, assetAddress: USDC_MAINNET, amount: "1000000" },
                output: { chainId: 1, assetAddress: USDT_MAINNET, amount: "2000000" },
            });
            expect(() => validate(params)).not.toThrow();
        });

        it("compares addresses case-insensitively", () => {
            const upper = ("0x" + USDC_MAINNET.slice(2).toUpperCase()) as Address;
            const lower = USDC_MAINNET.toLowerCase() as Address;
            const params = buildParams({
                input: { chainId: 1, assetAddress: upper, amount: "1000000" },
                output: { chainId: 1, assetAddress: lower, amount: "1000000" },
            });
            expect(() => validate(params)).toThrow(InsufficientFee);
        });

        it("rejects cross-chain same asset with output >= input", () => {
            const params = buildParams({
                input: { chainId: base.id, assetAddress: USDC_BASE, amount: "1000000" },
                output: { chainId: arbitrum.id, assetAddress: USDC_ARBITRUM, amount: "1000000" },
            });
            expect(() => validate(params, KNOWN_TOKEN_METADATA)).toThrow(InsufficientFee);
        });

        it("skips fee check for cross-chain different assets", () => {
            const params = buildParams({
                input: { chainId: base.id, assetAddress: USDC_BASE, amount: "1000000" },
                output: { chainId: arbitrum.id, assetAddress: WETH_ARBITRUM, amount: "2000000" },
            });
            expect(() => validate(params, KNOWN_TOKEN_METADATA)).not.toThrow();
        });

        it("skips cross-chain fee check when tokenMetadata is empty", () => {
            const params = buildParams({
                input: { chainId: 1, assetAddress: USDC_MAINNET, amount: "1000000" },
                output: { chainId: 10, assetAddress: USDC_OPTIMISM, amount: "2000000" },
            });
            expect(() => validate(params)).not.toThrow();
        });
    });

    describe("deadline", () => {
        it("rejects past deadline", () => {
            const params = buildParams({ fillDeadline: NOW - 100 });
            expect(() => validate(params)).toThrow(InvalidDeadline);
            expect(() => validate(params)).toThrow("in the past");
        });

        it("rejects deadline equal to now", () => {
            expect(() => validate(buildParams({ fillDeadline: NOW }))).toThrow(InvalidDeadline);
        });

        it("rejects deadline less than 60s from now", () => {
            const params = buildParams({ fillDeadline: NOW + 30 });
            expect(() => validate(params)).toThrow(InvalidDeadline);
            expect(() => validate(params)).toThrow("too soon");
        });

        it("accepts exactly 60s from now", () => {
            const params = buildParams({ fillDeadline: NOW + MIN_DEADLINE_BUFFER_SECONDS });
            expect(() => validate(params)).not.toThrow();
        });

        it("accepts far future deadline", () => {
            expect(() => validate(buildParams({ fillDeadline: NOW + 86400 }))).not.toThrow();
        });
    });

    describe("asset support", () => {
        it("rejects token the provider does not support", () => {
            const params = buildParams();
            expect(() => validateAssetSupport(params, "across", false)).toThrow(UnsupportedAsset);
        });

        it("accepts token the provider supports", () => {
            const params = buildParams();
            expect(() => validateAssetSupport(params, "across", true)).not.toThrow();
        });

        it("skips validation when allowDangerousParameters is set", () => {
            const params = buildParams({ allowDangerousParameters: true });
            expect(() => validateAssetSupport(params, "across", false)).not.toThrow();
        });
    });

    describe("allowDangerousParameters", () => {
        it("skips all validations when enabled", () => {
            const params = buildParams({
                input: { chainId: 1, assetAddress: USDC_MAINNET, amount: "0" },
                output: { chainId: 1, assetAddress: USDC_MAINNET, amount: "0" },
                fillDeadline: NOW - 100,
                allowDangerousParameters: true,
            });
            expect(() => validate(params)).not.toThrow();
        });
    });
});
