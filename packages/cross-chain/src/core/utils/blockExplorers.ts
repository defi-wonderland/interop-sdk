import type { Hex } from "viem";

import { getChainById } from "./chainHelpers.js";

/**
 * Build a chain block-explorer URL for a transaction.
 *
 * Returns `undefined` when the chain isn't in viem's catalogue, or when the
 * chain has no default block explorer registered. This lets providers fall
 * back gracefully without forcing consumers to handle thrown errors.
 */
export function getChainExplorerTxUrl(chainId: number, txHash: Hex): string | undefined {
    let chain;
    try {
        chain = getChainById(chainId);
    } catch {
        return undefined;
    }

    const explorerUrl = chain.blockExplorers?.default?.url;
    if (!explorerUrl) return undefined;

    const base = explorerUrl.endsWith("/") ? explorerUrl.slice(0, -1) : explorerUrl;
    return `${base}/tx/${txHash}`;
}
