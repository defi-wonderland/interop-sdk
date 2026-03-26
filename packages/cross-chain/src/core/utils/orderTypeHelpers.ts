import type {
    Oif3009Order,
    OifEscrowOrder,
    OifResourceLockOrder,
    Order,
} from "@openintentsframework/oif-specs";

export type SignableOifOrder = OifEscrowOrder | Oif3009Order | OifResourceLockOrder;

export function isSignableOifOrder(order: Order): order is SignableOifOrder {
    return (
        order.type === "oif-escrow-v0" ||
        order.type === "oif-3009-v0" ||
        order.type === "oif-resource-lock-v0"
    );
}
