import type { Address } from "viem";
import { erc20Abi } from "viem";

import type {
    AllowanceEntry,
    AllowanceReader,
    AllowanceResult,
} from "../../interfaces/approval.interface.js";
import { getChainById } from "../../utils/chainHelpers.js";
import { PublicClientManager } from "../../utils/publicClientManager.js";

/**
 * Reads ERC-20 allowances by batching `allowance()` calls into one
 * `multicall` per chain. Failures on one chain cannot affect others.
 */
export class MulticallAllowanceReader implements AllowanceReader {
    constructor(private readonly clientManager: PublicClientManager) {}

    async readAllowances(entries: AllowanceEntry[]): Promise<AllowanceResult[]> {
        const byChain = this.groupByChain(entries);

        const settled = await Promise.allSettled(
            byChain.map((group) => this.readChainAllowances(group.chainId, group.entries)),
        );

        return byChain.flatMap((group, i) => {
            const outcome = settled[i]!;
            if (outcome.status === "fulfilled") return outcome.value;
            return group.entries.map((entry) => ({ entry, allowance: null as bigint | null }));
        });
    }

    private async readChainAllowances(
        chainId: number,
        entries: AllowanceEntry[],
    ): Promise<AllowanceResult[]> {
        const client = this.clientManager.getClient(getChainById(chainId));
        const results = await client.multicall({
            contracts: entries.map((e) => ({
                address: e.tokenAddress as Address,
                abi: erc20Abi,
                functionName: "allowance" as const,
                args: [e.owner as Address, e.spender as Address],
            })),
        });

        return entries.map((entry, i) => {
            const call = results[i]!;
            return {
                entry,
                allowance: call.status === "success" ? (call.result as bigint) : null,
            };
        });
    }

    private groupByChain(
        entries: AllowanceEntry[],
    ): { chainId: number; entries: AllowanceEntry[] }[] {
        const map = new Map<number, AllowanceEntry[]>();
        for (const entry of entries) {
            const list = map.get(entry.chainId) ?? [];
            list.push(entry);
            map.set(entry.chainId, list);
        }
        return Array.from(map, ([chainId, groupEntries]) => ({
            chainId,
            entries: groupEntries,
        }));
    }
}
