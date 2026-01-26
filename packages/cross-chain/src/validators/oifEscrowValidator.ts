import type { GetQuoteRequest, OifEscrowOrder } from "@openintentsframework/oif-specs";
import { getAddress } from "@wonderland/interop-addresses";
import { isAddressEqual, getAddress as viemGetAddress } from "viem";

interface EscrowMessage {
    permitted?: Array<{ token?: string; amount?: string }>;
    spender?: string;
    deadline?: number;
}

export async function validateEscrowOrder(
    userIntent: GetQuoteRequest,
    order: OifEscrowOrder,
): Promise<boolean> {
    const payload = order.payload;
    if (!payload?.message) return false;

    const message = payload.message as EscrowMessage;
    if (!message.permitted?.length) return false;

    // TODO: Support multiple inputs (OIF standard supports multi-token intents via permitted[])
    const input = userIntent.intent.inputs[0];
    if (!input) return false;

    const permitted = message.permitted[0];
    if (!permitted) return false;

            if (!permitted.token) return false;
        if (!permitted.amount) return false;
        if (!message.spender) return false;
        if (message.deadline === undefined) return false;

        const trusted = {
            token: viemGetAddress(await getAddress(input.asset)),
            amount: input.amount !== undefined ? BigInt(input.amount) : undefined,
        };

        const orderToken = viemGetAddress(permitted.token);
        if (!isAddressEqual(orderToken, trusted.token)) return false;

        viemGetAddress(message.spender);

        const orderAmount = BigInt(permitted.amount);
        if (orderAmount < 0n) return false;
        if (trusted.amount !== undefined && orderAmount > trusted.amount) return false;

        const now = Math.floor(Date.now() / 1000);
        if (message.deadline < now) return false;

        return true;
}
