---
title: Frontend Integration
---

# Frontend Integration

The [getting-started guide](./getting-started.md) uses `privateKeyToAccount` and a plain Node.js script to keep things simple. In a real application you wire through an injected wallet — the user's browser extension or mobile app — using **wagmi v2** and a connector library such as **RainbowKit**.

This page shows the full pattern: how to obtain viem clients from wagmi hooks and how to structure a `useCrossChainSwap` hook that fetches quotes, handles ERC-20 approvals, and submits the order.

---

## Setup

Install the required packages:

```bash
npm install wagmi viem @rainbow-me/rainbowkit @tanstack/react-query
# or
pnpm add wagmi viem @rainbow-me/rainbowkit @tanstack/react-query
```

Create a wagmi config and wrap your Next.js app with the required providers:

```typescript
// lib/wagmi.ts
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { arbitrum, base, mainnet, optimism } from "wagmi/chains";

export const config = getDefaultConfig({
    appName: "My Cross-Chain App",
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
    chains: [mainnet, base, optimism, arbitrum],
});
```

```typescript
// app/providers.tsx  (or pages/_app.tsx for the Pages Router)
'use client'

import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from '../lib/wagmi'
import '@rainbow-me/rainbowkit/styles.css'

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

### Injected-only (no WalletConnect)

If you don't need WalletConnect — for example, you're targeting browser-extension wallets only and want to skip the WalletConnect project ID, RainbowKit, and the extra bundle weight — use wagmi's `injected` connector directly:

```typescript
// lib/wagmi.ts
import { createConfig, http } from "wagmi";
import { arbitrum, base, mainnet, optimism } from "wagmi/chains";
import { injected } from "wagmi/connectors";

export const config = createConfig({
    chains: [mainnet, base, optimism, arbitrum],
    connectors: [injected()],
    transports: {
        [mainnet.id]: http(),
        [base.id]: http(),
        [optimism.id]: http(),
        [arbitrum.id]: http(),
    },
});
```

The `Providers` tree simplifies to just `WagmiProvider` + `QueryClientProvider` — no `RainbowKitProvider` and no `'@rainbow-me/rainbowkit/styles.css'` import. `useWalletClient()` / `usePublicClient()` work the same way with either config.

---

## Core hook pattern

wagmi exposes `useWalletClient()` and `usePublicClient()` which return viem clients that are already connected to the user's injected wallet. These are exactly what the SDK needs.

```typescript
import { usePublicClient, useWalletClient } from "wagmi";

function useCrossChainSwap() {
    const { data: walletClient } = useWalletClient();
    const publicClient = usePublicClient();
    // ... use with SDK aggregator
}
```

`useWalletClient()` returns `undefined` until the wallet is connected, so guard against that before calling any SDK methods.

---

## ERC-20 approvals

Wire an `approvalService` into `createAggregator` once and every quote the aggregator returns already has any required `approve` `TransactionStep` prepended to `order.steps`. Your execution loop iterates all steps and fires each one in order — no separate approval code path, no per-render allowance reads.

```typescript
import {
    createAggregator,
    createApprovalService,
    createCrossChainProvider,
    PROTOCOLS,
} from "@wonderland/interop-cross-chain";

const approvalService = createApprovalService({
    rpcUrls: {
        1: process.env.NEXT_PUBLIC_ETH_RPC_URL!,
        8453: process.env.NEXT_PUBLIC_BASE_RPC_URL!,
    },
});

const aggregator = createAggregator({
    providers: [
        createCrossChainProvider(PROTOCOLS.ACROSS),
        createCrossChainProvider(PROTOCOLS.RELAY),
    ],
    approvalService,
});
```

The service reads on-chain allowances through a single `multicall` per chain and only prepends an `approve` step when the user's current allowance is below `required`. See [Automatic ERC-20 Approvals](./advanced-usage.md#automatic-erc-20-approvals) for the full configuration surface, including the `InfiniteAmountStrategy` variant.

`rpcUrls` is the right fit here because this demo bridges across multiple origin chains and the service reads allowances on each quote's input chain. Two other options exist for simpler setups: omit the config entirely to fall back to viem's default public RPC per chain (fine for quick experiments, rate-limited in production), or pass `publicClient` when every quote originates on the same chain (e.g. a checkout that only ever accepts USDC on mainnet). Note that reusing the wagmi `usePublicClient()` value here would not work — it is bound to one chain, and `publicClient` is used for every chain the service is asked about. See [Picking a client source](./advanced-usage.md#picking-a-client-source).

If you need the manual `readContract` / `writeContract` flow (no aggregator, or a provider that doesn't populate `order.checks.allowances`), see [Appendix: manual approval fallback](#appendix-manual-approval-fallback) below.

---

## Full example

The hook below covers the complete flow:

1. Create (or reuse) the aggregator (wired with `approvalService`)
2. Fetch quotes
3. Switch the wallet to the origin chain
4. Iterate `order.steps` — approvals are prepended automatically
5. Track until finalized

```typescript
import type { ExecutableQuote, QuoteRequest } from "@wonderland/interop-cross-chain";
import {
    createAggregator,
    createApprovalService,
    createCrossChainProvider,
    OrderStatus,
    OrderTrackerEvent,
    OrderTrackerFactory,
    PROTOCOLS,
} from "@wonderland/interop-cross-chain";
import { useCallback, useState } from "react";
import { usePublicClient, useSwitchChain, useWalletClient } from "wagmi";

// The signature payload submitOrder accepts for each signed step.
// (Not re-exported as `StepResult` from the package yet — define locally.)
type StepResult = { stepIndex: number; signature: `0x${string}` };

// Create the aggregator once (outside the hook so it is a singleton)
const rpcUrls = {
    1: process.env.NEXT_PUBLIC_ETH_RPC_URL!,
    8453: process.env.NEXT_PUBLIC_BASE_RPC_URL!,
};

const aggregator = createAggregator({
    providers: [
        createCrossChainProvider(PROTOCOLS.ACROSS),
        createCrossChainProvider(PROTOCOLS.RELAY),
    ],
    approvalService: createApprovalService({ rpcUrls }),
    trackerFactory: new OrderTrackerFactory({ rpcUrls }),
});

type SwapStatus =
    | "idle"
    | "quoting"
    | "submitting"
    | "submitted"
    | "tracking"
    | "finalized"
    | "timeout"
    | "error";

export function useCrossChainSwap() {
    const { data: walletClient } = useWalletClient();
    const publicClient = usePublicClient();
    const { switchChainAsync } = useSwitchChain();

    const [status, setStatus] = useState<SwapStatus>("idle");
    const [error, setError] = useState<string | null>(null);
    const [quotes, setQuotes] = useState<ExecutableQuote[]>([]);

    const execute = useCallback(
        async (request: QuoteRequest) => {
            if (!walletClient || !publicClient) {
                setError("Wallet not connected");
                return;
            }

            setError(null);

            try {
                // ── 1. Fetch quotes ──────────────────────────────────────────────────
                setStatus("quoting");
                const response = await aggregator.getQuotes(request);

                if (response.quotes.length === 0) {
                    setError("No quotes available");
                    setStatus("error");
                    return;
                }

                setQuotes(response.quotes);
                const quote = response.quotes[0];

                // ── 2. Ensure wallet is on the origin chain ──────────────────────────
                await switchChainAsync({ chainId: request.input.chainId });

                // ── 3. Submit the order ──────────────────────────────────────────────
                // Iterate order.steps in emission order. approvalService prepends
                // approval TransactionSteps onto signature-based quotes too, so a
                // single order can mix both kinds — handle each by `step.kind`.
                setStatus("submitting");

                const stepResults: StepResult[] = [];
                let lastTxHash: `0x${string}` | undefined;

                for (let i = 0; i < quote.order.steps.length; i++) {
                    const step = quote.order.steps[i];

                    if (step.kind === "transaction") {
                        const { to, data, value, gas, maxFeePerGas, maxPriorityFeePerGas } =
                            step.transaction;

                        const hash = await walletClient.sendTransaction({
                            to,
                            data,
                            value: value ? BigInt(value) : undefined,
                            gas: gas ? BigInt(gas) : undefined,
                            maxFeePerGas: maxFeePerGas ? BigInt(maxFeePerGas) : undefined,
                            maxPriorityFeePerGas: maxPriorityFeePerGas
                                ? BigInt(maxPriorityFeePerGas)
                                : undefined,
                        });

                        await publicClient.waitForTransactionReceipt({ hash });
                        lastTxHash = hash;
                    } else {
                        // signature step
                        const { signatureType, ...typedData } = step.signaturePayload;
                        const signature = await walletClient.signTypedData(typedData);
                        stepResults.push({ stepIndex: i, signature });
                    }
                }

                if (stepResults.length > 0) {
                    await aggregator.submitOrder(quote, stepResults);
                }

                // ── 4. Track until finalized ─────────────────────────────────────────
                // If the order contained a signature step, the solver submits the
                // bridge on-chain — there is no user-side bridge tx hash to follow.
                // Track by orderId instead (see intent-tracking.md).
                // Otherwise lastTxHash is the bridge tx (approvals are prepended).
                setStatus("tracking");

                if (stepResults.length === 0 && lastTxHash) {
                    const tracker = aggregator.track({
                        txHash: lastTxHash,
                        providerId: quote.provider,
                        originChainId: request.input.chainId,
                        destinationChainId: request.output.chainId,
                        timeout: 300_000, // 5 minutes
                    });

                    tracker.on(OrderStatus.Finalized, () => setStatus("finalized"));
                    tracker.on(OrderStatus.Failed, (update) => {
                        setError(update.failureReason ?? "Order failed");
                        setStatus("error");
                    });
                    tracker.on(OrderTrackerEvent.Timeout, () => {
                        // The SDK stopped watching but the order may still finalize on-chain
                        setStatus("timeout");
                    });
                    tracker.on(OrderTrackerEvent.Error, (err) => {
                        setError(err instanceof Error ? err.message : "Tracking error");
                        setStatus("error");
                    });
                } else {
                    // Solver-submitted: the bridge opens without a user-side tx hash.
                    // Track via quote.tracking?.orderId using watchOrder() from a
                    // standalone OrderTracker — see intent-tracking.md.
                    setStatus("submitted");
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "Unexpected error");
                setStatus("error");
            }
        },
        [walletClient, publicClient],
    );

    return { execute, status, error, quotes };
}
```

---

## Next steps

-   [Order Tracking](./intent-tracking.md) — detailed event reference and provider-specific notes
-   [Execute Intent](./example.md) — the equivalent Node.js script using `privateKeyToAccount`
-   [Advanced Usage](./advanced-usage.md) — sorting strategies, timeouts, error handling
-   [API Reference](./api.md) — complete function signatures and types

---

## Appendix: manual approval fallback

Reach for this when you can't use the aggregator's `approvalService` — for example, when you're driving a single provider directly, or the quote's provider doesn't declare its allowance requirements in `order.checks.allowances` (notably the OIF `oif-escrow-v0` Permit2 flow).

```typescript
import {
    getTransactionSteps,
    isNativeAddress,
    isSignatureOnlyOrder,
} from "@wonderland/interop-cross-chain";
import { erc20Abi } from "viem";

// 1. Prefer order.checks.allowances when the provider populates it.
const allowances = quote.order.checks?.allowances ?? [];

if (allowances.length > 0) {
    for (const { tokenAddress, spender, required } of allowances) {
        const current = await publicClient.readContract({
            address: tokenAddress,
            abi: erc20Abi,
            functionName: "allowance",
            args: [walletClient.account.address, spender],
        });

        if (current < BigInt(required)) {
            const hash = await walletClient.writeContract({
                address: tokenAddress,
                abi: erc20Abi,
                functionName: "approve",
                args: [spender, BigInt(required)],
            });
            await publicClient.waitForTransactionReceipt({ hash });
        }
    }
} else if (
    !isSignatureOnlyOrder(quote.order) &&
    !isNativeAddress(request.input.assetAddress, "eip155")
) {
    // 2. Fallback: derive the approval target from the transaction step.
    //    The `to` address is the contract that will pull tokens from the user.
    const step = getTransactionSteps(quote.order)[0];
    const spender = step.transaction.to;
    const input = quote.preview.inputs[0];

    const current = await publicClient.readContract({
        address: input.assetAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: "allowance",
        args: [walletClient.account.address, spender],
    });

    if (current < BigInt(input.amount)) {
        const hash = await walletClient.writeContract({
            address: input.assetAddress as `0x${string}`,
            abi: erc20Abi,
            functionName: "approve",
            args: [spender, BigInt(input.amount)],
        });
        await publicClient.waitForTransactionReceipt({ hash });
    }
}
```

For production use, `approvalService` is the recommended path — it batches the `allowance()` reads into a single `multicall` per chain and composes cleanly with the aggregator's sorting and tracking.
