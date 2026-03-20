import type { Address, Hex } from "viem";
import { createPublicClient, http, parseAbi } from "viem";
import * as chains from "viem/chains";

import { decodeAddress } from "../address/index.js";

/**
 * ChainResolver proxy contract on Ethereum mainnet (on.eth registry).
 * @see https://github.com/unruggable-labs/chain-resolver
 */
const CHAIN_RESOLVER_ADDRESS: Address = "0x2a9B5787207863cf2d63d20172ed1F7bB2c9487A";

const CHAIN_RESOLVER_ABI = parseAbi([
    "function chainCount() view returns (uint256)",
    "function getChainAtIndex(uint256) view returns (string label, string chainName, bytes interoperableAddress)",
]);

export interface RegisteredChain {
    /** Chain label in the registry (e.g., "optimism", "base") */
    label: string;
    /** Human-readable chain name (e.g., "OP Mainnet", "Base") */
    name: string;
    /** CAIP-2 chain type (e.g., "eip155", "solana", "bip122") */
    chainType: string;
    /** CAIP-2 chain reference (e.g., "1", "10", "8453") */
    chainReference: string;
}

export interface GetRegisteredChainsOptions {
    /** Ethereum mainnet RPC URL. Falls back to MAINNET_RPC_URL env var. */
    rpcUrl?: string;
}

/**
 * Fetches all chains registered in the on.eth ChainResolver contract.
 *
 * Calls `chainCount()` then `getChainAtIndex()` for each index via multicall,
 * and decodes the ERC-7930 interoperable address to extract the CAIP-2 chain type and reference.
 *
 * @see https://github.com/unruggable-labs/chain-resolver/blob/main/web/mainnet_on.html#L830
 *
 * @example
 * ```ts
 * const chains = await getRegisteredChains({ rpcUrl: process.env.MAINNET_RPC_URL });
 * // [{ label: "optimism", name: "OP Mainnet", chainType: "eip155", chainReference: "10" }, ...]
 * ```
 */
export async function getRegisteredChains(
    options?: GetRegisteredChainsOptions,
): Promise<RegisteredChain[]> {
    const rpcUrl = options?.rpcUrl ?? process.env.MAINNET_RPC_URL;

    const client = createPublicClient({
        chain: chains.mainnet,
        transport: http(rpcUrl),
    });

    const count = await client.readContract({
        address: CHAIN_RESOLVER_ADDRESS,
        abi: CHAIN_RESOLVER_ABI,
        functionName: "chainCount",
    });

    const totalChains = Number(count);
    if (totalChains === 0) return [];

    const calls = Array.from({ length: totalChains }, (_, i) => ({
        address: CHAIN_RESOLVER_ADDRESS,
        abi: CHAIN_RESOLVER_ABI,
        functionName: "getChainAtIndex" as const,
        args: [BigInt(i)],
    }));

    const results = await client.multicall({ contracts: calls });

    const entries: RegisteredChain[] = [];

    for (const result of results) {
        if (result.status !== "success") continue;

        const [label, name, addr] = result.result;
        if (!addr || addr === "0x") continue;

        try {
            const decoded = decodeAddress(addr as Hex);
            if (!decoded.chainType || !decoded.chainReference) continue;
            entries.push({
                label,
                name,
                chainType: String(decoded.chainType),
                chainReference: String(decoded.chainReference),
            });
        } catch {
            continue;
        }
    }

    return entries;
}
