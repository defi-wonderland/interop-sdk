import type { Hex } from "viem";
import { encodeFunctionData, pad } from "viem";

import type { Quote } from "../../../core/schemas/quote.js";
import type { BuildQuoteRequest } from "../../../core/schemas/quoteRequest.js";
import { OPEN_ABI } from "../constants.js";

/**
 * Builds an SDK {@link Quote} with a TransactionStep for the ERC-7683 open() call.
 *
 * This is the inverse of `fromOifUserOpenOrder` in orderAdapter.ts:
 * SDK BuildQuoteRequest → ABI-encoded open() calldata → Quote with TransactionStep.
 *
 * @see https://eips.ethereum.org/EIPS/eip-7683
 */

const DEFAULT_ORDER_DATA_TYPE = pad("0x00" as Hex, { size: 32 });

/**
 * Build an SDK {@link Quote} from a {@link BuildQuoteRequest}.
 *
 * Encodes the ERC-7683 `open(OnchainCrossChainOrder)` calldata targeting the
 * user-provided escrow contract address.
 */
export function buildOifQuote(params: BuildQuoteRequest, providerId: string): Quote {
    const orderDataType = params.orderDataType
        ? (pad(params.orderDataType as Hex, { size: 32 }) as Hex)
        : DEFAULT_ORDER_DATA_TYPE;

    const orderData = (params.orderData ?? "0x") as Hex;

    const calldata = encodeFunctionData({
        abi: OPEN_ABI,
        functionName: "open",
        args: [
            {
                fillDeadline: params.fillDeadline,
                orderDataType,
                orderData,
            },
        ],
    });

    const recipient = params.output.recipient ?? params.user;

    return {
        provider: providerId,
        order: {
            steps: [
                {
                    kind: "transaction" as const,
                    chainId: params.input.chainId,
                    transaction: {
                        to: params.escrowContractAddress,
                        data: calldata,
                    },
                },
            ],
            checks: {
                allowances: [
                    {
                        chainId: params.input.chainId,
                        tokenAddress: params.input.assetAddress,
                        owner: params.user,
                        spender: params.escrowContractAddress,
                        required: params.input.amount,
                    },
                ],
            },
        },
        preview: {
            inputs: [
                {
                    chainId: params.input.chainId,
                    accountAddress: params.user,
                    assetAddress: params.input.assetAddress,
                    amount: params.input.amount,
                },
            ],
            outputs: [
                {
                    chainId: params.output.chainId,
                    accountAddress: recipient,
                    assetAddress: params.output.assetAddress,
                    amount: params.output.amount,
                },
            ],
        },
        metadata: {
            buildQuote: true,
            fillDeadline: params.fillDeadline,
            escrowContractAddress: params.escrowContractAddress,
        },
    };
}
