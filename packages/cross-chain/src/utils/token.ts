import { Address, Chain, erc20Abi, formatUnits, getContract, parseUnits, PublicClient } from "viem";

import { GetTokenAllowanceIssue, GetTokenDecimalsIssue } from "../internal.js";

/**
 * Obtain token decimals from contract
 * @param tokenAddress address of the contract
 * @param chain chain where token is deployed
 * @param publicClient Viem PublicClient
 * @returns Token decimals as number
 */
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

/**
 * Get token allowance for owner/spender pair
 * @param tokenAddress Address of the token contract
 * @param chain Chain where token is deployed
 * @param owner Address of the owner
 * @param spender Address of the spender
 * @param publicClient Viem PublicClient
 * @returns Token allowance as bigint
 */
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

/**
 * Format token amount to human-readable format, checking the decimals of the token
 * @param amount Amount to format
 * @param tokenAddress Address of the token contract
 * @param chain Chain where token is deployed
 * @param publicClient Viem PublicClient
 * @returns Formatted token amount as string
 */
export const formatTokenAmount = async (
    { amount, tokenAddress, chain }: { amount: bigint; tokenAddress: Address; chain: Chain },
    { publicClient }: { publicClient: PublicClient },
): Promise<string> => {
    const tokenDecimals = await getTokenDecimals({ tokenAddress, chain }, { publicClient });

    return formatUnits(amount, tokenDecimals);
};

/**
 * Parse token amount from human-readable format to bigint, checking the decimals of the token
 * @param amount Amount to parse
 * @param tokenAddress Address of the token contract
 * @param chain Chain where token is deployed
 * @param publicClient Viem PublicClient
 * @returns Parsed token amount as bigint
 */
export const parseTokenAmount = async (
    { amount, tokenAddress, chain }: { amount: string; tokenAddress: Address; chain: Chain },
    { publicClient }: { publicClient: PublicClient },
): Promise<bigint> => {
    const tokenDecimals = await getTokenDecimals({ tokenAddress, chain }, { publicClient });

    return parseUnits(amount, tokenDecimals);
};
