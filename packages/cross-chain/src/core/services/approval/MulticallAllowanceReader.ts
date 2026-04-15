import { erc20Abi } from "viem";

import type {
    Allowance,
    AllowanceEntry,
    AllowanceReader,
    AllowanceResult,
} from "../../interfaces/approval.interface.js";
import { getChainById } from "../../utils/chainHelpers.js";
import { PublicClientManager } from "../../utils/publicClientManager.js";

interface IndexedEntry {
    entry: AllowanceEntry;
    index: number;
}

interface IndexedResult {
    index: number;
    result: AllowanceResult;
}

interface ChainBatch {
    chainId: number;
    indexed: IndexedEntry[];
}

/**
 * Reads ERC-20 allowances by batching `allowance()` calls into one
 * `multicall` per chain. Failures on one chain cannot affect others.
 */
export class MulticallAllowanceReader implements AllowanceReader {
    constructor(private readonly clientManager: PublicClientManager) {}

    async readAllowances(entries: AllowanceEntry[]): Promise<AllowanceResult[]> {
        const batches = groupByChain(entries);
        const batchResults = await Promise.all(batches.map((batch) => this.readBatch(batch)));
        return assembleInOrder(entries.length, batchResults.flat());
    }

    private async readBatch(batch: ChainBatch): Promise<IndexedResult[]> {
        const allowances = await this.multicallAllowances(
            batch.chainId,
            batch.indexed.map((i) => i.entry),
        );
        return batch.indexed.map((item, i) => ({
            index: item.index,
            result: { entry: item.entry, allowance: allowances[i]! },
        }));
    }

    private async multicallAllowances(
        chainId: number,
        entries: AllowanceEntry[],
    ): Promise<Allowance[]> {
        try {
            const client = this.clientManager.getClient(getChainById(chainId));
            const results = await client.multicall({
                contracts: entries.map((e) => ({
                    address: e.tokenAddress,
                    abi: erc20Abi,
                    functionName: "allowance" as const,
                    args: [e.owner, e.spender],
                })),
            });
            return results.map((r) => (r.status === "success" ? (r.result as bigint) : null));
        } catch {
            return entries.map(() => null);
        }
    }
}

function groupByChain(entries: AllowanceEntry[]): ChainBatch[] {
    const groups: Record<number, IndexedEntry[]> = {};
    entries.forEach((entry, index) => {
        (groups[entry.chainId] ??= []).push({ entry, index });
    });
    return Object.entries(groups).map(([chainId, indexed]) => ({
        chainId: Number(chainId),
        indexed,
    }));
}

function assembleInOrder(length: number, indexed: IndexedResult[]): AllowanceResult[] {
    const results = new Array<AllowanceResult>(length);
    for (const { index, result } of indexed) results[index] = result;
    return results;
}
