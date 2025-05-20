import { Address, Chain, erc20Abi, formatUnits, getContract, parseUnits, PublicClient } from "viem";

import { GetTokenAllowanceIssue, GetTokenDecimalsIssue } from "../internal.js";

export const getTokenDecimals = async (
    { tokenAddress, chain }: { tokenAddress: Address; chain: Chain },
    { publicClient }: { publicClient: PublicClient },
): Promise<number> => {
    const contract = getContract({
        address: tokenAddress,
        abi: erc20Abi,
        client: { public: publicClient, chain },
    });

    try {
        const decimals = await contract.read.decimals();
        return decimals;
    } catch (error) {
        throw new GetTokenDecimalsIssue(
            error instanceof Error ? error.message : "Unknown error getting token decimals",
        );
    }
};

export const getTokenAllowance = async (
    {
        tokenAddress,
        chain,
        owner,
        spender,
    }: { tokenAddress: Address; chain: Chain; owner: Address; spender: Address },
    { publicClient }: { publicClient: PublicClient },
): Promise<bigint> => {
    const contract = getContract({
        address: tokenAddress,
        abi: erc20Abi,
        client: { public: publicClient, chain },
    });

    try {
        const allowance = await contract.read.allowance([owner, spender]);
        return allowance;
    } catch (error) {
        throw new GetTokenAllowanceIssue(
            error instanceof Error ? error.message : "Unknown error getting token allowance",
        );
    }
};

export const formatTokenAmount = async (
    { amount, tokenAddress, chain }: { amount: bigint; tokenAddress: Address; chain: Chain },
    { publicClient }: { publicClient: PublicClient },
): Promise<string> => {
    const tokenDecimals = await getTokenDecimals({ tokenAddress, chain }, { publicClient });

    return formatUnits(amount, tokenDecimals);
};

export const parseTokenAmount = async (
    { amount, tokenAddress, chain }: { amount: string; tokenAddress: Address; chain: Chain },
    { publicClient }: { publicClient: PublicClient },
): Promise<bigint> => {
    const tokenDecimals = await getTokenDecimals({ tokenAddress, chain }, { publicClient });

    return parseUnits(amount, tokenDecimals);
};
