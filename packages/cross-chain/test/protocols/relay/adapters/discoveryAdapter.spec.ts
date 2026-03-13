import { describe, expect, it } from "vitest";

import { parseRelayChainsResponse } from "../../../../src/protocols/relay/adapters/discoveryAdapter.js";

// ── Constants ────────────────────────────────────────────

const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const USDC_ID = `${USDC_ADDRESS}_1`;
const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const WETH_ID = `${WETH_ADDRESS}_1`;
const SOL_ADDRESS = "So111";
const SOL_ID = `${SOL_ADDRESS}_792703809`;

const ETHEREUM_CHAIN_ID = 1;
const OPTIMISM_CHAIN_ID = 10;
const ARBITRUM_CHAIN_ID = 42_161;
const SOLANA_CHAIN_ID = 792_703_809;

// ── Helpers ─────────────────────────────────────────────

function makeSolverCurrency(overrides?: Record<string, unknown>): Record<string, unknown> {
    return {
        id: USDC_ID,
        address: USDC_ADDRESS,
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
        ...overrides,
    };
}

function makeChain(
    id: number,
    vmType: string,
    currencies: Record<string, unknown>[],
): Record<string, unknown> {
    return { id, vmType, solverCurrencies: currencies };
}

// ── Tests ────────────────────────────────────────────────

describe("parseRelayChainsResponse", () => {
    it("filters to EVM chains and maps to NetworkAssets", () => {
        const result = parseRelayChainsResponse({
            chains: [
                makeChain(ETHEREUM_CHAIN_ID, "evm", [makeSolverCurrency()]),
                makeChain(SOLANA_CHAIN_ID, "svm", [
                    makeSolverCurrency({
                        id: SOL_ID,
                        address: SOL_ADDRESS,
                        symbol: "SOL",
                        name: "Wrapped SOL",
                        decimals: 9,
                    }),
                ]),
            ],
        });

        expect(result).toHaveLength(1);
        expect(result[0]!.chainId).toBe(ETHEREUM_CHAIN_ID);
        expect(result[0]!.assets).toHaveLength(1);
        expect(result[0]!.assets[0]!.symbol).toBe("USDC");
    });

    it("treats chains without vmType as EVM (legacy entries)", () => {
        const result = parseRelayChainsResponse({
            chains: [{ id: ARBITRUM_CHAIN_ID, solverCurrencies: [makeSolverCurrency()] }],
        });

        expect(result).toHaveLength(1);
        expect(result[0]!.chainId).toBe(ARBITRUM_CHAIN_ID);
    });

    it("deduplicates addresses within the same chain (case-insensitive)", () => {
        const result = parseRelayChainsResponse({
            chains: [
                makeChain(ETHEREUM_CHAIN_ID, "evm", [
                    makeSolverCurrency(),
                    makeSolverCurrency({ address: USDC_ADDRESS.toLowerCase() }),
                ]),
            ],
        });

        expect(result[0]!.assets).toHaveLength(1);
    });

    it("drops chains with no solver currencies", () => {
        const result = parseRelayChainsResponse({
            chains: [
                makeChain(ETHEREUM_CHAIN_ID, "evm", []),
                makeChain(OPTIMISM_CHAIN_ID, "evm", [makeSolverCurrency()]),
            ],
        });

        expect(result).toHaveLength(1);
        expect(result[0]!.chainId).toBe(OPTIMISM_CHAIN_ID);
    });

    it("returns empty array when no EVM chains exist", () => {
        const result = parseRelayChainsResponse({
            chains: [
                makeChain(SOLANA_CHAIN_ID, "svm", [
                    makeSolverCurrency({
                        id: SOL_ID,
                        address: SOL_ADDRESS,
                        symbol: "SOL",
                        name: "Wrapped SOL",
                        decimals: 9,
                    }),
                ]),
            ],
        });

        expect(result).toHaveLength(0);
    });

    it("maps multiple chains with multiple assets", () => {
        const result = parseRelayChainsResponse({
            chains: [
                makeChain(ETHEREUM_CHAIN_ID, "evm", [
                    makeSolverCurrency(),
                    makeSolverCurrency({
                        id: WETH_ID,
                        address: WETH_ADDRESS,
                        symbol: "WETH",
                        name: "Wrapped Ether",
                        decimals: 18,
                    }),
                ]),
                makeChain(OPTIMISM_CHAIN_ID, "evm", [makeSolverCurrency()]),
            ],
        });

        expect(result).toHaveLength(2);
        expect(result[0]!.assets).toHaveLength(2);
        expect(result[1]!.assets).toHaveLength(1);
    });

    it("preserves original address casing in output", () => {
        const result = parseRelayChainsResponse({
            chains: [makeChain(ETHEREUM_CHAIN_ID, "evm", [makeSolverCurrency()])],
        });

        expect(result[0]!.assets[0]!.address).toBe(USDC_ADDRESS);
    });

    it("excludes all non-EVM vmTypes", () => {
        const result = parseRelayChainsResponse({
            chains: [
                makeChain(ETHEREUM_CHAIN_ID, "evm", [makeSolverCurrency()]),
                makeChain(SOLANA_CHAIN_ID, "svm", [
                    makeSolverCurrency({
                        id: SOL_ID,
                        address: SOL_ADDRESS,
                        symbol: "SOL",
                        name: "Wrapped SOL",
                        decimals: 9,
                    }),
                ]),
                makeChain(999, "tvm", []),
            ],
        });

        expect(result).toHaveLength(1);
        expect(result[0]!.chainId).toBe(ETHEREUM_CHAIN_ID);
    });

    it("maps only address, symbol, and decimals to AssetInfo", () => {
        const result = parseRelayChainsResponse({
            chains: [makeChain(ETHEREUM_CHAIN_ID, "evm", [makeSolverCurrency()])],
        });

        const asset = result[0]!.assets[0]!;
        expect(asset).toEqual({
            address: USDC_ADDRESS,
            symbol: "USDC",
            decimals: 6,
        });
    });

    it("excludes disabled EVM chains", () => {
        const result = parseRelayChainsResponse({
            chains: [
                { ...makeChain(ETHEREUM_CHAIN_ID, "evm", [makeSolverCurrency()]), disabled: true },
                makeChain(OPTIMISM_CHAIN_ID, "evm", [makeSolverCurrency()]),
            ],
        });

        expect(result).toHaveLength(1);
        expect(result[0]!.chainId).toBe(OPTIMISM_CHAIN_ID);
    });

    it("includes EVM chains with disabled explicitly set to false", () => {
        const result = parseRelayChainsResponse({
            chains: [
                { ...makeChain(ETHEREUM_CHAIN_ID, "evm", [makeSolverCurrency()]), disabled: false },
            ],
        });

        expect(result).toHaveLength(1);
        expect(result[0]!.chainId).toBe(ETHEREUM_CHAIN_ID);
    });

    it("includes EVM chains without disabled field (defaults to enabled)", () => {
        const result = parseRelayChainsResponse({
            chains: [makeChain(ETHEREUM_CHAIN_ID, "evm", [makeSolverCurrency()])],
        });

        expect(result).toHaveLength(1);
        expect(result[0]!.chainId).toBe(ETHEREUM_CHAIN_ID);
    });

    it("keeps first occurrence when deduplicating", () => {
        const result = parseRelayChainsResponse({
            chains: [
                makeChain(ETHEREUM_CHAIN_ID, "evm", [
                    makeSolverCurrency({ address: USDC_ADDRESS, symbol: "USDC-original" }),
                    makeSolverCurrency({
                        address: USDC_ADDRESS.toLowerCase(),
                        symbol: "USDC-duplicate",
                    }),
                ]),
            ],
        });

        expect(result[0]!.assets[0]!.symbol).toBe("USDC-original");
    });
});
