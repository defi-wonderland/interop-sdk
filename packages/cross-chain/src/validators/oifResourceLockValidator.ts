import type { GetQuoteRequest, OifResourceLockOrder } from "@openintentsframework/oif-specs";
import { getAddress } from "@wonderland/interop-addresses";
import { isAddressEqual, getAddress as viemGetAddress } from "viem";

interface ResourceLockMessage {
    expires?: string | number;
    sponsor?: string;
    commitments?: Array<{ token?: string; amount?: string }>;
}

export async function validateResourceLockOrder(
    userIntent: GetQuoteRequest,
    order: OifResourceLockOrder,
): Promise<boolean> {
    const payload = order.payload;
    if (!payload?.message) return false;

    const message = payload.message as ResourceLockMessage;

    // TODO: Support multiple inputs (OIF standard supports multi-token intents via commitments[])
    const input = userIntent.intent.inputs[0];
    if (!input) return false;

    if (message.expires === undefined) return false;
        if (!message.sponsor) return false;
        if (!message.commitments?.length) return false;

        const commitment = message.commitments[0];
        if (!commitment) return false;
        if (!commitment.token) return false;
        if (!commitment.amount) return false;

        const now = Math.floor(Date.now() / 1000);
        const expires =
            typeof message.expires === "string" ? parseInt(message.expires, 10) : message.expires;
        if (!Number.isFinite(expires)) return false;
        if (expires < now) return false;

        const trusted = {
            user: viemGetAddress(await getAddress(input.user)),
            token: viemGetAddress(await getAddress(input.asset)),
            amount: input.amount !== undefined ? BigInt(input.amount) : undefined,
        };

        const orderSponsor = viemGetAddress(message.sponsor);
        if (!isAddressEqual(orderSponsor, trusted.user)) return false;

        const orderToken = viemGetAddress(commitment.token);
        if (!isAddressEqual(orderToken, trusted.token)) return false;

        const orderAmount = BigInt(commitment.amount);
        if (orderAmount < 0n) return false;
        if (trusted.amount !== undefined && orderAmount > trusted.amount) return false;

        return true;
    } catch {
        return false;
    }
}
