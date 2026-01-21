import type { GetQuoteRequest, OifUserOpenIntentOrder } from "@openintentsframework/oif-specs";
import { getAddress } from "@wonderland/interop-addresses";
import { isAddressEqual, getAddress as viemGetAddress } from "viem";

export async function validateUserOpenOrder(
    userIntent: GetQuoteRequest,
    order: OifUserOpenIntentOrder,
): Promise<boolean> {
    // TODO: Support multiple inputs (OIF standard supports multi-token intents)
    const input = userIntent.intent.inputs[0];
    if (!input) return false;

    const allowances = order.checks.allowances;
    if (!allowances.length) return false;

    const allowance = allowances[0];
    if (!allowance) return false;

    const trusted = {
        user: viemGetAddress(await getAddress(input.user)),
        token: viemGetAddress(await getAddress(input.asset)),
        amount: input.amount !== undefined ? BigInt(input.amount) : undefined,
    };

    // Validate tx destination matches allowance spender
    const txTo = viemGetAddress(await getAddress(order.openIntentTx.to));
    const orderSpender = viemGetAddress(await getAddress(allowance.spender));
    if (!isAddressEqual(txTo, orderSpender)) return false;

    // Validate token matches user intent
    const orderToken = viemGetAddress(await getAddress(allowance.token));
    if (!isAddressEqual(orderToken, trusted.token)) return false;

    // Validate user matches
    const orderUser = viemGetAddress(await getAddress(allowance.user));
    if (!isAddressEqual(orderUser, trusted.user)) return false;

    // Validate required amount doesn't exceed user's intended amount
    if (trusted.amount !== undefined) {
        if (BigInt(allowance.required) > trusted.amount) return false;
    }

    return true;
}
