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

    if (!order.openIntentTx?.to) return false;
        if (!allowance.spender) return false;
        if (!allowance.token) return false;
        if (!allowance.user) return false;
        if (!allowance.required) return false;

        const trusted = {
            user: viemGetAddress(await getAddress(input.user)),
            token: viemGetAddress(await getAddress(input.asset)),
            amount: input.amount !== undefined ? BigInt(input.amount) : undefined,
        };

        const txTo = viemGetAddress(await getAddress(order.openIntentTx.to));
        const orderSpender = viemGetAddress(await getAddress(allowance.spender));
        if (!isAddressEqual(txTo, orderSpender)) return false;

        const orderToken = viemGetAddress(await getAddress(allowance.token));
        if (!isAddressEqual(orderToken, trusted.token)) return false;

        const orderUser = viemGetAddress(await getAddress(allowance.user));
        if (!isAddressEqual(orderUser, trusted.user)) return false;

        const requiredAmount = BigInt(allowance.required);
        if (requiredAmount < 0n) return false;
        if (trusted.amount !== undefined && requiredAmount > trusted.amount) return false;

        return true;
    } catch {
        return false;
    }
}
