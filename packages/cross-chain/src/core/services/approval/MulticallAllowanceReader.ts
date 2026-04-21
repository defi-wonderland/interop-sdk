import { erc20Abi } from "viem";

import type {
    Allowance,
    AllowanceEntry,
    AllowanceReader,
    AllowanceResult,
    ApprovalReadFailure,
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
 *
 * An optional `onReadFailure` callback is invoked whenever an entire chain
 * batch fails (registry lookup miss or multicall rejection). Individual
 * probe reverts are represented as `null` allowances per entry and do not
 * trigger the callback.
 */
export class MulticallAllowanceReader implements AllowanceReader {
    constructor(
        private readonly clientManager: PublicClientManager,
        private readonly onReadFailure: (failure: ApprovalReadFailure) => void = () => {},
    ) {}

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
        let client;
        try {
            client = this.clientManager.getClient(getChainById(chainId));
        } catch (error) {
            this.onReadFailure({ chainId, reason: "unknown-chain", error });
            return entries.map(() => null);
        }

        try {
            const results = await client.multicall({
                contracts: entries.map((e) => ({
                    address: e.tokenAddress,
                    abi: erc20Abi,
                    functionName: "allowance" as const,
                    args: [e.owner, e.spender],
                })),
            });
            return results.map((r) => (r.status === "success" ? (r.result as bigint) : null));
        } catch (error) {
            this.onReadFailure({ chainId, reason: "multicall", error });
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
