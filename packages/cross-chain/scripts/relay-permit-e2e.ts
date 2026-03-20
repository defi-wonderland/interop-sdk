/**
 * E2E test script: Relay permit flow on testnet.
 *
 * Exercises the full gasless permit flow:
 *   Base Sepolia USDC -> Sepolia USDC
 *
 * Usage (from monorepo root):
 *   pnpm build && cd packages/cross-chain && ../../node_modules/.bin/tsx scripts/relay-permit-e2e.ts
 *
 * Requires ETH_PRIVATE_KEY (or BASE_SEPOLIA_PRIVATE_KEY) in environment.
 */

import type { Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import {
    createAggregator,
    getSignatureSteps,
    OrderTrackerYieldType,
    RelayProvider,
} from "../src/external.js";

// ── Config ──────────────────────────────────────────────

const ORIGIN_CHAIN_ID = 84532; // Base Sepolia
const DESTINATION_CHAIN_ID = 11155111; // Sepolia

const BASE_SEPOLIA_USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const SEPOLIA_USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

const AMOUNT = "1000000"; // 1 USDC (6 decimals)

// ── Helpers ─────────────────────────────────────────────

function log(phase: string, message: string): void {
    const timestamp = new Date().toISOString().slice(11, 23);
    console.log(`[${timestamp}] [${phase}] ${message}`);
}

// ── Main ────────────────────────────────────────────────

async function main(): Promise<void> {
    const rawKey = process.env.ETH_PRIVATE_KEY ?? process.env.BASE_SEPOLIA_PRIVATE_KEY;

    if (!rawKey) {
        throw new Error("Missing ETH_PRIVATE_KEY or BASE_SEPOLIA_PRIVATE_KEY in environment");
    }

    const privateKey = (rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`) as Hex;

    const account = privateKeyToAccount(privateKey);
    log("setup", `Wallet: ${account.address}`);

    // ── SDK init ────────────────────────────────────────

    const aggregator = createAggregator({
        providers: [new RelayProvider({ isTestnet: true, usePermit: true })],
    });

    // ── Step 1: Get quote ───────────────────────────────

    log("quote", "Requesting quote...");

    const { quotes, errors } = await aggregator.getQuotes({
        user: account.address,
        input: {
            chainId: ORIGIN_CHAIN_ID,
            assetAddress: BASE_SEPOLIA_USDC,
            amount: AMOUNT,
        },
        output: {
            chainId: DESTINATION_CHAIN_ID,
            assetAddress: SEPOLIA_USDC,
        },
        swapType: "exact-input",
    });

    if (errors.length > 0) {
        console.error(
            "Quote errors:",
            errors.map((e) => e.errorMsg),
        );
    }

    const quote = quotes[0];
    if (!quote) {
        throw new Error("No quotes returned");
    }

    log("quote", `Quote received — quoteId: ${quote.quoteId}`);
    log("quote", `  orderId: ${quote.tracking?.orderId ?? "N/A"}`);

    // ── Step 2: Sign EIP-712 permit ─────────────────────

    const sigSteps = getSignatureSteps(quote.order);
    const sigStep = sigSteps[0];
    if (!sigStep) {
        throw new Error("No signature step found in order");
    }

    log("sign", "Signing EIP-712 permit...");

    const { domain, types, primaryType, message } = sigStep.signaturePayload;

    const signature = await account.signTypedData({
        domain,
        types,
        primaryType,
        message: message as Record<string, unknown>,
    });

    log("sign", `Signature: ${signature.slice(0, 20)}...`);

    // ── Step 3: Submit order ────────────────────────────

    log("submit", "Submitting order...");

    const { orderId } = await aggregator.submitOrder(quote, signature);

    log("submit", `Order submitted — orderId: ${orderId}`);

    // ── Step 4: Track order ─────────────────────────────

    log("track", "Watching order...");

    const tracker = aggregator.prepareTracking("relay");

    for await (const item of tracker.watchOrder({
        orderId,
        originChainId: ORIGIN_CHAIN_ID,
        destinationChainId: DESTINATION_CHAIN_ID,
    })) {
        if (item.type === OrderTrackerYieldType.Update) {
            log("track", `[${item.update.status}] ${item.update.message}`);

            if (item.update.fillTxHash) {
                log("track", `  fillTxHash: ${item.update.fillTxHash}`);
            }
        } else {
            log("track", `[timeout] ${item.payload.message}`);
        }
    }

    log("done", "Script finished");
}

main().catch((err) => {
    console.error("\nFatal error:", err);
    process.exit(1);
});
