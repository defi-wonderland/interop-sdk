import type { Address } from "viem";
import { encodeFunctionData, erc20Abi } from "viem";

import type {
    AllowanceEntry,
    AllowanceReader,
    ApprovalAmountStrategy,
    ApprovalService,
} from "../../interfaces/approval.interface.js";
import type { TransactionStep } from "../../schemas/order.js";
import type { ExecutableQuote } from "../../schemas/quote.js";

/**
 * Reads on-chain ERC-20 allowances for every quote and prepends approval
 * `TransactionStep`s into `order.steps` when the current allowance is
 * insufficient.
 *
 * Never throws -- on any failure the affected quotes pass through unmodified.
 */
export class DefaultApprovalService implements ApprovalService {
    constructor(
        private readonly reader: AllowanceReader,
        private readonly amountStrategy: ApprovalAmountStrategy,
        private readonly gasLimit?: bigint,
    ) {}

    async enrichQuotes(quotes: ExecutableQuote[]): Promise<ExecutableQuote[]> {
        const entries = this.collectUniqueEntries(quotes);
        if (entries.length === 0) return quotes;

        const allowances = await this.readAllowanceMap(entries);
        if (!allowances) return quotes;

        return quotes.map((quote) => this.enrichQuote(quote, allowances));
    }

    private async readAllowanceMap(
        entries: AllowanceEntry[],
    ): Promise<Map<string, bigint | null> | null> {
        try {
            const results = await this.reader.readAllowances(entries);
            return new Map(results.map((r) => [this.entryKey(r.entry), r.allowance]));
        } catch {
            return null;
        }
    }

    private enrichQuote(
        quote: ExecutableQuote,
        allowances: Map<string, bigint | null>,
    ): ExecutableQuote {
        const checks = quote.order.checks?.allowances;
        if (!checks?.length) return quote;

        const approvalSteps = checks
            .filter((check) => this.needsApproval(check, allowances))
            .map((check) => this.buildApprovalStep(check));

        if (approvalSteps.length === 0) return quote;

        return {
            ...quote,
            order: {
                ...quote.order,
                steps: [...approvalSteps, ...quote.order.steps],
            },
        };
    }

    private needsApproval(
        check: {
            chainId: number;
            tokenAddress: string;
            owner: string;
            spender: string;
            required: string;
        },
        allowances: Map<string, bigint | null>,
    ): boolean {
        const onChain = allowances.get(this.entryKey(check));
        if (onChain == null) return false;
        return onChain < BigInt(check.required);
    }

    private buildApprovalStep(check: {
        chainId: number;
        tokenAddress: string;
        spender: string;
        required: string;
    }): TransactionStep {
        const amount = this.amountStrategy.resolve(BigInt(check.required));
        return {
            kind: "transaction",
            chainId: check.chainId,
            description: "Token approval",
            transaction: {
                to: check.tokenAddress,
                data: encodeFunctionData({
                    abi: erc20Abi,
                    functionName: "approve",
                    args: [check.spender as Address, amount],
                }),
                ...(this.gasLimit ? { gas: this.gasLimit.toString() } : {}),
            },
        };
    }

    private collectUniqueEntries(quotes: ExecutableQuote[]): AllowanceEntry[] {
        const seen = new Set<string>();
        const entries: AllowanceEntry[] = [];

        for (const quote of quotes) {
            for (const check of quote.order.checks?.allowances ?? []) {
                const key = this.entryKey(check);
                if (seen.has(key)) continue;
                seen.add(key);
                entries.push({
                    chainId: check.chainId,
                    tokenAddress: check.tokenAddress,
                    owner: check.owner,
                    spender: check.spender,
                });
            }
        }

        return entries;
    }

    private entryKey(e: {
        chainId: number;
        tokenAddress: string;
        owner: string;
        spender: string;
    }): string {
        return `${e.chainId}:${e.tokenAddress.toLowerCase()}:${e.owner.toLowerCase()}:${e.spender.toLowerCase()}`;
    }
}
