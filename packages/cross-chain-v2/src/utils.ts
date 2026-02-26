import type { SwapOrderStatus } from "./types/swap.js";

export function isTerminalStatus(status: SwapOrderStatus): boolean {
    return (
        status === "finalized" ||
        status === "failed" ||
        status === "expired" ||
        status === "refunded"
    );
}

export function nowSeconds(): number {
    return Math.floor(Date.now() / 1000);
}

export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
