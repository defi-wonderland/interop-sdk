import type { Address } from "viem";
import { arbitrum, base, mainnet, optimism } from "viem/chains";
import { describe, expect, it } from "vitest";

import type { BuildQuoteRequest } from "../../src/core/schemas/quoteRequest.js";
import { DifferentAssetNotAllowed } from "../../src/core/errors/DifferentAssetNotAllowed.exception.js";
import { InsufficientFee } from "../../src/core/errors/InsufficientFee.exception.js";
import { InvalidDeadline } from "../../src/core/errors/InvalidDeadline.exception.js";
import { SameChainIntentNotAllowed } from "../../src/core/errors/SameChainIntentNotAllowed.exception.js";
import { ZeroAmount } from "../../src/core/errors/ZeroAmount.exception.js";
import {
    MIN_DEADLINE_BUFFER_SECONDS,
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
    [mainnet.id]: {
        [USDC_MAINNET.toLowerCase()]: { symbol: "USDC" },
    },
    [optimism.id]: {
        [USDC_OPTIMISM.toLowerCase()]: { symbol: "USDC" },
    },
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
        input: { chainId: mainnet.id, assetAddress: USDC_MAINNET, amount: "1000000" },
        output: { chainId: optimism.id, assetAddress: USDC_OPTIMISM, amount: "990000" },
        escrowContractAddress: "0x5c7BCd6E7De5423a257D81B442095A1a6ced35C5",
        fillDeadline: NOW + 3600,
        ...overrides,
    };
}

const validate = (params: BuildQuoteRequest, metadata = KNOWN_TOKEN_METADATA): void =>
    validateBuildQuoteParams(params, metadata, NOW);

describe("validateBuildQuoteParams", () => {
    describe("zero amount", () => {
        it("rejects input amount '0'", () => {
            const params = buildParams({
                input: { chainId: mainnet.id, assetAddress: USDC_MAINNET, amount: "0" },
            });
            expect(() => validate(params)).toThrow(ZeroAmount);
            expect(() => validate(params)).toThrow("input.amount must be greater than zero");
        });

        it("rejects output amount '0'", () => {
            const params = buildParams({
                output: { chainId: optimism.id, assetAddress: USDC_OPTIMISM, amount: "0" },
            });
            expect(() => validate(params)).toThrow(ZeroAmount);
            expect(() => validate(params)).toThrow("output.amount must be greater than zero");
        });

        it("accepts non-zero amounts", () => {
            expect(() => validate(buildParams())).not.toThrow();
        });
    });

    describe("same-chain rejection", () => {
        it("rejects same asset on same chain", () => {
            const params = buildParams({
                input: { chainId: mainnet.id, assetAddress: USDC_MAINNET, amount: "1000000" },
                output: { chainId: mainnet.id, assetAddress: USDC_MAINNET, amount: "990000" },
            });
            expect(() => validate(params)).toThrow(SameChainIntentNotAllowed);
            expect(() => validate(params)).toThrow("same-chain intents");
        });

        it("rejects different asset on same chain", () => {
            const params = buildParams({
                input: { chainId: mainnet.id, assetAddress: USDC_MAINNET, amount: "1000000" },
                output: { chainId: mainnet.id, assetAddress: USDT_MAINNET, amount: "2000000" },
            });
            expect(() => validate(params)).toThrow(SameChainIntentNotAllowed);
        });
    });

    describe("same-asset requirement", () => {
        it("rejects cross-chain different assets", () => {
            const params = buildParams({
                input: { chainId: base.id, assetAddress: USDC_BASE, amount: "1000000" },
                output: { chainId: arbitrum.id, assetAddress: WETH_ARBITRUM, amount: "2000000" },
            });
            expect(() => validate(params)).toThrow(DifferentAssetNotAllowed);
            expect(() => validate(params)).toThrow("same-asset transfers");
        });

        it("rejects cross-chain when token metadata is unavailable", () => {
            const params = buildParams({
                input: { chainId: mainnet.id, assetAddress: USDC_MAINNET, amount: "1000000" },
                output: { chainId: optimism.id, assetAddress: USDC_OPTIMISM, amount: "990000" },
            });
            expect(() => validate(params, {})).toThrow(DifferentAssetNotAllowed);
        });

        it("allows cross-chain unknown metadata with allowDangerousParameters", () => {
            const params = buildParams({
                input: { chainId: mainnet.id, assetAddress: USDC_MAINNET, amount: "1000000" },
                output: { chainId: optimism.id, assetAddress: USDC_OPTIMISM, amount: "990000" },
                allowDangerousParameters: true,
            });
            expect(() => validate(params, {})).not.toThrow();
        });
    });

    describe("fee margin", () => {
        it("rejects cross-chain same asset with output >= input (equal)", () => {
            const params = buildParams({
                input: { chainId: base.id, assetAddress: USDC_BASE, amount: "1000000" },
                output: { chainId: arbitrum.id, assetAddress: USDC_ARBITRUM, amount: "1000000" },
            });
            expect(() => validate(params)).toThrow(InsufficientFee);
        });

        it("accepts cross-chain same asset with output < input", () => {
            const params = buildParams({
                input: { chainId: base.id, assetAddress: USDC_BASE, amount: "1000000" },
                output: { chainId: arbitrum.id, assetAddress: USDC_ARBITRUM, amount: "990000" },
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

    describe("allowDangerousParameters", () => {
        it("skips all validations when enabled", () => {
            const params = buildParams({
                input: { chainId: mainnet.id, assetAddress: USDC_MAINNET, amount: "0" },
                output: { chainId: mainnet.id, assetAddress: USDC_MAINNET, amount: "0" },
                fillDeadline: NOW - 100,
                allowDangerousParameters: true,
            });
            expect(() => validate(params)).not.toThrow();
        });

        it("bypasses same-chain restriction when enabled", () => {
            const params = buildParams({
                input: { chainId: mainnet.id, assetAddress: USDC_MAINNET, amount: "1000000" },
                output: { chainId: mainnet.id, assetAddress: USDT_MAINNET, amount: "2000000" },
                allowDangerousParameters: true,
            });
            expect(() => validate(params)).not.toThrow();
        });
    });
});
