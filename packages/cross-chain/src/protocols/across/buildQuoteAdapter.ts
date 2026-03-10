import type { Address, Hex } from "viem";
import { encodeFunctionData, pad } from "viem";

import type { Quote } from "../../core/schemas/quote.js";
import type { BuildQuoteRequest } from "../../core/schemas/quoteRequest.js";
import { ACROSS_SPOKE_POOL_ADDRESSES, ACROSS_SPOKE_POOL_DEPOSIT_ABI } from "./constants.js";

/**
 * Builds an SDK {@link Quote} with a TransactionStep for Across SpokePool.deposit().
 *
 * Encodes the deposit calldata locally without calling the Across API.
 * The user controls the fee by setting both input and output amounts.
 *
 * @see https://docs.across.to/reference/contract-addresses/
 */

const ZERO_BYTES32 = pad("0x00" as Hex, { size: 32 });
const ACROSS_DEFAULT_MESSAGE: Hex = "0x73c0de";

function addressToBytes32(address: string): Hex {
    return pad(address as Address, { size: 32 });
}

/**
 * Build an SDK {@link Quote} from a {@link BuildQuoteRequest} for Across.
 *
 * Encodes a `SpokePool.deposit()` call targeting the known SpokePool address
 * for the origin chain (falls back to `escrowContractAddress` for unknown chains).
 */
export function buildAcrossQuote(params: BuildQuoteRequest, providerId: string): Quote {
    const spokePoolAddress =
        ACROSS_SPOKE_POOL_ADDRESSES[params.input.chainId] ?? params.escrowContractAddress;

    const quoteTimestamp = Math.floor(Date.now() / 1000);
    const recipient = params.output.recipient ?? params.user;

    const calldata = encodeFunctionData({
        abi: ACROSS_SPOKE_POOL_DEPOSIT_ABI,
        functionName: "deposit",
        args: [
            addressToBytes32(params.user),
            addressToBytes32(recipient),
            addressToBytes32(params.input.assetAddress),
            addressToBytes32(params.output.assetAddress),
            BigInt(params.input.amount),
            BigInt(params.output.amount),
            BigInt(params.output.chainId),
            ZERO_BYTES32,
            quoteTimestamp,
            params.fillDeadline,
            0,
            ACROSS_DEFAULT_MESSAGE,
        ],
    });

    return {
        provider: providerId,
        order: {
            steps: [
                {
                    kind: "transaction" as const,
                    chainId: params.input.chainId,
                    transaction: {
                        to: spokePoolAddress,
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
                        spender: spokePoolAddress,
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
            spokePoolAddress,
            quoteTimestamp,
            fillDeadline: params.fillDeadline,
        },
    };
}
