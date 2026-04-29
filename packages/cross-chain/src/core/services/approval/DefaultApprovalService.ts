import type { Address } from "viem";
import { encodeFunctionData, erc20Abi, maxUint256 } from "viem";

import type {
    AllowanceCheck,
    AllowanceEntry,
    AllowanceLookup,
    AllowanceReader,
    ApprovalAmountStrategy,
    ApprovalService,
} from "../../interfaces/approval.interface.js";
import type { TransactionStep } from "../../schemas/order.js";
import type { ExecutableQuote } from "../../schemas/quote.js";
import { allowanceKey, toAllowanceEntry } from "../../interfaces/approval.interface.js";

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
        const pairs = quotes.map((quote) => ({
            quote,
            checks: quote.order.checks?.allowances ?? [],
        }));
        const allChecks = pairs.flatMap((p) => p.checks);
        if (allChecks.length === 0) return quotes;

        const lookup = await this.fetchAllowanceLookup(allChecks);
        if (!lookup) return quotes;

        return pairs.map(({ quote, checks }) =>
            this.enrichQuoteWithApprovals(quote, checks, lookup),
        );
    }

    private async fetchAllowanceLookup(checks: AllowanceCheck[]): Promise<AllowanceLookup | null> {
        const seen = new Set<string>();
        const uniqueEntries: AllowanceEntry[] = [];

        for (const check of checks) {
            const key = allowanceKey(check);
            if (seen.has(key)) continue;
            seen.add(key);
            uniqueEntries.push(toAllowanceEntry(check));
        }

        try {
            const results = await this.reader.readAllowances(uniqueEntries);
            const lookup: AllowanceLookup = {};
            for (const { entry, allowance } of results) {
                lookup[allowanceKey(entry)] = allowance;
            }
            return lookup;
        } catch {
            return null;
        }
    }

    private enrichQuoteWithApprovals(
        quote: ExecutableQuote,
        checks: AllowanceCheck[],
        lookup: AllowanceLookup,
    ): ExecutableQuote {
        if (checks.some((check) => lookup[allowanceKey(check)] == null)) {
            return quote;
        }

        const approvalSteps = checks
            .filter((check) => {
                const onChain = lookup[allowanceKey(check)]!;
                return onChain < BigInt(check.required);
            })
            .map((check) => this.createApprovalStep(check));

        if (approvalSteps.length === 0) return quote;

        return {
            ...quote,
            order: {
                ...quote.order,
                steps: [...approvalSteps, ...quote.order.steps],
            },
        };
    }

    private createApprovalStep(check: AllowanceCheck): TransactionStep {
        const amount = this.resolveApprovalAmount(check);
        return {
            kind: "transaction",
            category: "approval",
            chainId: check.chainId,
            description: "Token approval",
            transaction: {
                to: check.tokenAddress,
                data: encodeFunctionData({
                    abi: erc20Abi,
                    functionName: "approve",
                    args: [check.spender as Address, amount],
                }),
                ...(this.gasLimit != null ? { gas: this.gasLimit.toString() } : {}),
            },
        };
    }

    private resolveApprovalAmount(check: AllowanceCheck): bigint {
        if (check.preferInfinite) return maxUint256;
        return this.amountStrategy.resolve(BigInt(check.required));
    }
}
