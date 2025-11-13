import type viem from "viem";
import { erc20Abi, getContract, PublicClient } from "viem";
import { sepolia } from "viem/chains";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    formatTokenAmount,
    getTokenAllowance,
    getTokenDecimals,
    parseTokenAmount,
} from "../../src/utils/token.js";

const mockAllowance = vi.fn();
const mockDecimals = vi.fn();

vi.mock("viem", async () => {
    const actual = await vi.importActual<typeof viem>("viem");
    return {
        ...actual,
        getContract: vi.fn(),
    };
});

describe("Token", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        vi.mocked(getContract).mockReturnValue({
            read: {
                allowance: mockAllowance,
                decimals: mockDecimals,
            },
        });
    });

    describe("getTokenDecimals", () => {
        it("return the correct number of decimals", async () => {
            mockDecimals.mockResolvedValue(18);

            const decimals = await getTokenDecimals(
                {
                    tokenAddress: "0x0000000000000000000000000000000000000000",
                    chain: sepolia,
                },
                { publicClient: {} as PublicClient },
            );

            expect(decimals).toBe(18);
        });

        it("call to getContract", async () => {
            await getTokenDecimals(
                { tokenAddress: "0x0000000000000000000000000000000000000000", chain: sepolia },
                { publicClient: {} as PublicClient },
            );

            expect(getContract).toHaveBeenCalledWith({
                address: "0x0000000000000000000000000000000000000000",
                abi: erc20Abi,
                client: { public: {} as PublicClient, chain: sepolia },
            });
        });

        it("call to read.decimals", async () => {
            await getTokenDecimals(
                { tokenAddress: "0x0000000000000000000000000000000000000000", chain: sepolia },
                { publicClient: {} as PublicClient },
            );

            expect(mockDecimals).toHaveBeenCalledWith();
        });
    });
    describe("getTokenAllowance", () => {
        it("return the correct allowance", async () => {
            mockAllowance.mockResolvedValue(1000000000000000000n);

            const allowance = await getTokenAllowance(
                {
                    tokenAddress: "0x0000000000000000000000000000000000000000",
                    chain: sepolia,
                    owner: "0x0000000000000000000000000000000000000001",
                    spender: "0x0000000000000000000000000000000000000002",
                },
                { publicClient: {} as PublicClient },
            );

            expect(allowance).toBe(1000000000000000000n);
        });

        it("call to getContract", async () => {
            await getTokenAllowance(
                {
                    tokenAddress: "0x0000000000000000000000000000000000000000",
                    chain: sepolia,
                    owner: "0x0000000000000000000000000000000000000001",
                    spender: "0x0000000000000000000000000000000000000002",
                },
                { publicClient: {} as PublicClient },
            );

            expect(getContract).toHaveBeenCalledWith({
                address: "0x0000000000000000000000000000000000000000",
                abi: erc20Abi,
                client: { public: {} as PublicClient, chain: sepolia },
            });
        });

        it("call to read.allowance", async () => {
            await getTokenAllowance(
                {
                    tokenAddress: "0x0000000000000000000000000000000000000000",
                    chain: sepolia,
                    owner: "0x0000000000000000000000000000000000000001",
                    spender: "0x0000000000000000000000000000000000000002",
                },
                { publicClient: {} as PublicClient },
            );

            expect(mockAllowance).toHaveBeenCalledWith([
                "0x0000000000000000000000000000000000000001",
                "0x0000000000000000000000000000000000000002",
            ]);
        });
    });
    describe("formatTokenAmount", () => {
        it("return the correct formatted amount", async () => {
            mockDecimals.mockResolvedValue(18);

            const formattedAmount = await formatTokenAmount(
                {
                    amount: 1000000000000000000n,
                    tokenAddress: "0x0000000000000000000000000000000000000000",
                    chain: sepolia,
                },
                { publicClient: {} as PublicClient },
            );

            expect(formattedAmount).toEqual("1");
        });
    });
    describe("parseTokenAmount", () => {
        it("return the correct parsed amount", async () => {
            mockDecimals.mockResolvedValue(18);

            const parsedAmount = await parseTokenAmount(
                {
                    amount: "1",
                    tokenAddress: "0x0000000000000000000000000000000000000000",
                    chain: sepolia,
                },
                { publicClient: {} as PublicClient },
            );

            expect(parsedAmount).toEqual(1000000000000000000n);
        });
    });
});
