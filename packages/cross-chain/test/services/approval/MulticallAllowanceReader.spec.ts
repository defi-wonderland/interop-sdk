import type { Address, Chain } from "viem";
import { describe, expect, it, vi } from "vitest";

import type {
    AllowanceEntry,
    AllowanceReadFailure,
    AllowanceReadFailureHandler,
} from "../../../src/core/interfaces/approval.interface.js";
import type { PublicClientManager } from "../../../src/core/utils/publicClientManager.js";
import { MulticallAllowanceReader } from "../../../src/core/services/approval/MulticallAllowanceReader.js";

function makeHandler(): AllowanceReadFailureHandler & { handle: ReturnType<typeof vi.fn> } {
    return { handle: vi.fn() };
}

const UNKNOWN_CHAIN_ID = 123_456_789;

vi.mock("../../../src/core/utils/chainHelpers.js", () => ({
    getChainById: (chainId: number): Chain => {
        if (chainId === UNKNOWN_CHAIN_ID) throw new Error(`Unsupported chain ID: ${chainId}`);
        return { id: chainId, name: `chain-${chainId}` } as unknown as Chain;
    },
}));

const TOKEN = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as Address;
const OWNER = "0x0000000000000000000000000000000000000001" as Address;
const SPENDER = "0x0000000000000000000000000000000000000002" as Address;

function entry(chainId: number, overrides?: Partial<AllowanceEntry>): AllowanceEntry {
    return { chainId, tokenAddress: TOKEN, owner: OWNER, spender: SPENDER, ...overrides };
}

function makeClientManager(
    multicallImpl: (...args: unknown[]) => Promise<unknown>,
): PublicClientManager {
    return {
        getClient: vi.fn(() => ({ multicall: multicallImpl })),
    } as unknown as PublicClientManager;
}

describe("MulticallAllowanceReader", () => {
    it("returns the on-chain allowance for each entry", async () => {
        const clientManager = makeClientManager(async () => [{ status: "success", result: 500n }]);
        const reader = new MulticallAllowanceReader(clientManager);

        const results = await reader.readAllowances([entry(1)]);

        expect(results).toHaveLength(1);
        expect(results[0]!.allowance).toBe(500n);
    });

    it("reads allowances on Ethereum mainnet", async () => {
        const clientManager = makeClientManager(async () => [
            { status: "success", result: 1_000n },
        ]);
        const reader = new MulticallAllowanceReader(clientManager);

        const results = await reader.readAllowances([entry(1)]);

        expect(results[0]!.allowance).toBe(1_000n);
    });

    it("groups entries by chain and makes one multicall per chain", async () => {
        const multicall = vi.fn(async ({ contracts }: { contracts: unknown[] }) =>
            contracts.map(() => ({ status: "success", result: 100n })),
        );
        const getClient = vi.fn(() => ({ multicall }));
        const clientManager = { getClient } as unknown as PublicClientManager;
        const reader = new MulticallAllowanceReader(clientManager);

        await reader.readAllowances([entry(1), entry(1), entry(42)]);

        expect(getClient).toHaveBeenCalledTimes(2);
        expect(multicall).toHaveBeenCalledTimes(2);
    });

    it("returns null on a reverting probe without invoking the failure handler", async () => {
        const handler = makeHandler();
        const clientManager = makeClientManager(async () => [
            { status: "success", result: 500n },
            { status: "failure", error: new Error("revert") },
        ]);
        const reader = new MulticallAllowanceReader(clientManager, handler);

        const results = await reader.readAllowances([
            entry(1),
            entry(1, { spender: "0x0000000000000000000000000000000000000099" }),
        ]);

        expect(results[0]!.allowance).toBe(500n);
        expect(results[1]!.allowance).toBeNull();
        expect(handler.handle).not.toHaveBeenCalled();
    });

    it("reports a multicall rejection through the failure handler with reason 'multicall'", async () => {
        const rpcError = new Error("RPC down");
        const handler = makeHandler();
        const getClient = vi.fn((chain: Chain) => ({
            multicall:
                chain.id === 42
                    ? vi.fn(async () => {
                          throw rpcError;
                      })
                    : vi.fn(async () => [{ status: "success", result: 100n }]),
        }));
        const clientManager = { getClient } as unknown as PublicClientManager;
        const reader = new MulticallAllowanceReader(clientManager, handler);

        const results = await reader.readAllowances([entry(1), entry(42)]);

        expect(results.find((r) => r.entry.chainId === 1)!.allowance).toBe(100n);
        expect(results.find((r) => r.entry.chainId === 42)!.allowance).toBeNull();
        expect(handler.handle).toHaveBeenCalledTimes(1);
        expect(handler.handle).toHaveBeenCalledWith({
            chainId: 42,
            reason: "multicall",
            error: rpcError,
        } satisfies AllowanceReadFailure);
    });

    it("reports an unknown-chain lookup through the failure handler with reason 'unknown-chain'", async () => {
        const handler = makeHandler();
        const clientManager = makeClientManager(async () => [{ status: "success", result: 100n }]);
        const reader = new MulticallAllowanceReader(clientManager, handler);

        const results = await reader.readAllowances([entry(1), entry(UNKNOWN_CHAIN_ID)]);

        expect(results.find((r) => r.entry.chainId === 1)!.allowance).toBe(100n);
        expect(results.find((r) => r.entry.chainId === UNKNOWN_CHAIN_ID)!.allowance).toBeNull();
        expect(handler.handle).toHaveBeenCalledTimes(1);
        expect(handler.handle).toHaveBeenCalledWith(
            expect.objectContaining({
                chainId: UNKNOWN_CHAIN_ID,
                reason: "unknown-chain",
            }),
        );
    });

    it("defaults to DefaultAllowanceReadFailureHandler when none is provided", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const clientManager = makeClientManager(async () => {
            throw new Error("boom");
        });
        const reader = new MulticallAllowanceReader(clientManager);

        const results = await reader.readAllowances([entry(1)]);

        expect(results[0]!.allowance).toBeNull();
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
    });

    it("returns empty array for empty input", async () => {
        const clientManager = makeClientManager(async () => []);
        const reader = new MulticallAllowanceReader(clientManager);

        const results = await reader.readAllowances([]);

        expect(results).toEqual([]);
    });
});
