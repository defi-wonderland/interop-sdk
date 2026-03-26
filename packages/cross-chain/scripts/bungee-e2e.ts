/**
 * Bungee Full Flow E2E — getQuotes → sign → submit → track
 *
 * Usage:
 *   ETH_PRIVATE_KEY=<key> npx tsx packages/cross-chain/scripts/bungee-e2e.ts
 *
 * Prerequisites:
 *   - ETH_PRIVATE_KEY env var (with or without 0x prefix)
 *   - Wallet must have OP USDC balance
 *   - Wallet must have Permit2 approval for USDC on Optimism
 */

import type { Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { BungeeProvider } from "../src/protocols/bungee/provider.js";

// ── Config ──────────────────────────────────────────────

const OP_USDC = "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85";
const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const AMOUNT = "1000000"; // 1.00 USDC (6 decimals)
const BASE_URL = "https://public-backend.bungee.exchange";
const POLL_INTERVAL_MS = 5_000;
const MAX_POLLS = 36; // 3 minutes

const STATUS_NAMES: Record<number, string> = {
    0: "PENDING",
    1: "ASSIGNED",
    2: "EXTRACTED",
    3: "FULFILLED",
    4: "SETTLED",
    5: "EXPIRED",
    6: "CANCELLED",
    7: "REFUNDED",
};

// ── Helpers ─────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
}

function resolvePrivateKey(): Hex {
    const raw = process.env.ETH_PRIVATE_KEY;
    if (!raw) {
        console.error("ETH_PRIVATE_KEY env var is required");
        process.exit(1);
    }
    return (raw.startsWith("0x") ? raw : `0x${raw}`) as Hex;
}

// ── Main ────────────────────────────────────────────────

async function main(): Promise<void> {
    const privateKey = resolvePrivateKey();
    const account = privateKeyToAccount(privateKey);
    const provider = new BungeeProvider();

    console.log(`Wallet: ${account.address}`);
    console.log(`Route:  OP USDC → Base USDC (${AMOUNT} wei = 1.00 USDC)\n`);

    // ── 1. Get quotes ───────────────────────────────────
    console.log("[1] Getting quotes...");

    const quotes = await provider.getQuotes({
        user: account.address,
        input: { chainId: 10, assetAddress: OP_USDC, amount: AMOUNT },
        output: { chainId: 8453, assetAddress: BASE_USDC },
    });

    if (quotes.length === 0) {
        console.error("No quotes returned — solvers may be offline.");
        process.exit(1);
    }

    const quote = quotes[0]!;
    const step = quote.order.steps[0]!;

    console.log(`    ${quotes.length} quote(s) received`);
    console.log(`    quoteId: ${quote.quoteId}`);
    console.log(`    output:  ${quote.preview.outputs[0]?.amount} wei`);
    console.log(`    eta:     ${quote.eta}s`);
    console.log(`    step:    ${step.kind}`);
    if (quote.fees?.originGas) {
        console.log(`    gas fee: ${quote.fees.originGas.amountUsd} USD`);
    }
    console.log();

    // ── 2. Sign ─────────────────────────────────────────
    if (step.kind !== "signature") {
        console.error(`Expected signature step, got: ${step.kind}`);
        process.exit(1);
    }

    console.log("[2] Signing permit2 typed data...");

    const { domain, types, message } = step.signaturePayload;

    // Remove EIP712Domain from types if present (viem adds it automatically)
    const { EIP712Domain: _, ...cleanTypes } = types as Record<
        string,
        Array<{ name: string; type: string }>
    >;

    const signature = await account.signTypedData({
        domain,
        types: cleanTypes,
        primaryType: "PermitWitnessTransferFrom",
        message: message as Record<string, unknown>,
    });

    console.log(`    signature: ${signature.slice(0, 20)}...`);
    console.log();

    // ── 3. Submit ───────────────────────────────────────
    console.log("[3] Submitting order...");

    const submitResult = await provider.submitOrder(quote, signature);

    console.log(`    orderId: ${submitResult.orderId}`);
    console.log(`    status:  ${submitResult.status}`);
    if (submitResult.message) {
        console.log(`    message: ${submitResult.message}`);
    }
    console.log();

    if (submitResult.status !== "submitted") {
        console.error("Submit failed.");
        process.exit(1);
    }

    // ── 4. Poll status ──────────────────────────────────
    console.log("[4] Polling status...");

    const requestHash = submitResult.orderId;
    let finalCode = -1;

    for (let i = 0; i < MAX_POLLS; i++) {
        await sleep(POLL_INTERVAL_MS);

        const res = await fetch(`${BASE_URL}/api/v1/bungee/status?requestHash=${requestHash}`);
        const data = (await res.json()) as {
            result: Array<{
                bungeeStatusCode: number;
                destinationData?: { txHash?: string | null };
            }>;
        };

        if (!data.result?.length) {
            console.log(`    [POLL ${i + 1}] No results yet`);
            continue;
        }

        const entry = data.result[0]!;
        finalCode = entry.bungeeStatusCode;
        const name = STATUS_NAMES[finalCode] ?? `UNKNOWN(${finalCode})`;
        console.log(`    [POLL ${i + 1}] ${name} (${finalCode})`);

        // Terminal states
        if (finalCode === 3 || finalCode === 4) {
            const destTx = entry.destinationData?.txHash;
            console.log(`\n    Destination txHash: ${destTx ?? "N/A"}`);
            console.log("\nDone! Order finalized.");
            return;
        }

        if (finalCode === 5) {
            console.log("\nOrder EXPIRED — solver did not fill in time.");
            process.exit(1);
        }

        if (finalCode === 6 || finalCode === 7) {
            console.log(`\nOrder ${name}.`);
            process.exit(1);
        }
    }

    console.log(`\nPolling timed out after ${MAX_POLLS} attempts. Last status: ${finalCode}`);
    process.exit(1);
}

main().catch((err) => {
    console.error("E2E failed:", err);
    process.exit(1);
});
