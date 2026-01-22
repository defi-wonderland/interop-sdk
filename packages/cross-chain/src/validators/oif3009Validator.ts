import type { GetQuoteRequest, Oif3009Order } from "@openintentsframework/oif-specs";
import type { Address } from "viem";
import { getAddress } from "@wonderland/interop-addresses";
import { isAddressEqual, getAddress as viemGetAddress } from "viem";

interface Eip3009Message {
    from?: string;
    to?: string;
    value?: string;
    validBefore?: number;
}

// Per OIF spec: metadata contains orderHash, chainId, tokenAddress
interface Eip3009Metadata {
    orderHash?: string;
    chainId?: number;
    tokenAddress?: string;
}

export async function validate3009Order(
    userIntent: GetQuoteRequest,
    order: Oif3009Order,
): Promise<boolean> {
    const payload = order.payload;
    if (!payload?.message) return false;

    const input = userIntent.intent.inputs[0];
    if (!input) return false;

    const trusted = {
        user: (await getAddress(input.user)) as Address,
        token: (await getAddress(input.asset)) as Address,
        amount: input.amount !== undefined ? BigInt(input.amount) : undefined,
    };

    const message = payload.message as Eip3009Message;
    const metadata = order.metadata as Eip3009Metadata | undefined;

    if (message.from) {
        const orderFrom = viemGetAddress(message.from);
        if (!isAddressEqual(orderFrom, trusted.user)) return false;
    }

    if (message.value && trusted.amount !== undefined) {
        if (BigInt(message.value) > trusted.amount) return false;
    }

    if (message.validBefore) {
        const now = Math.floor(Date.now() / 1000);
        if (message.validBefore < now) return false;
    }

    if (metadata?.tokenAddress) {
        const metadataToken = viemGetAddress(metadata.tokenAddress);
        if (!isAddressEqual(metadataToken, trusted.token)) return false;
    }

    return true;
}
