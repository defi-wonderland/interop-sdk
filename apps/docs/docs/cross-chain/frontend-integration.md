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
import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { mainnet, base, optimism, arbitrum } from 'wagmi/chains'

export const config = getDefaultConfig({
  appName: 'My Cross-Chain App',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
  chains: [mainnet, base, optimism, arbitrum],
})
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

---

## Core hook pattern

wagmi exposes `useWalletClient()` and `usePublicClient()` which return viem clients that are already connected to the user's injected wallet. These are exactly what the SDK needs.

```typescript
import { useWalletClient, usePublicClient } from 'wagmi'

function useCrossChainSwap() {
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  // ... use with SDK aggregator
}
```

`useWalletClient()` returns `undefined` until the wallet is connected, so guard against that before calling any SDK methods.

---

## Full example

The hook below covers the complete flow:

1. Create (or reuse) the aggregator
2. Fetch quotes
3. Switch the wallet to the origin chain
4. Check `order.checks.allowances` for ERC-20 approvals
5. Submit the order
6. Track until finalized

```typescript
import { useCallback, useState } from 'react'
import { useWalletClient, usePublicClient, useSwitchChain } from 'wagmi'
import {
  createAggregator,
  createCrossChainProvider,
  getSignatureSteps,
  getTransactionSteps,
  isSignatureOnlyOrder,
  isNativeAddress,
  OrderTrackerFactory,
  OrderStatus,
  OrderTrackerEvent,
  type QuoteRequest,
  type Quote,
} from '@wonderland/interop-cross-chain'
import { erc20Abi } from 'viem'

// Create the aggregator once (outside the hook so it is a singleton)
const acrossProvider = createCrossChainProvider('across')
const relayProvider = createCrossChainProvider('relay')

const aggregator = createAggregator({
  providers: [acrossProvider, relayProvider],
  trackerFactory: new OrderTrackerFactory({
    rpcUrls: {
      // Provide RPC URLs for any chains you want to track on
      1: process.env.NEXT_PUBLIC_ETH_RPC_URL!,
      8453: process.env.NEXT_PUBLIC_BASE_RPC_URL!,
    },
  }),
})

type SwapStatus =
  | 'idle'
  | 'quoting'
  | 'approving'
  | 'submitting'
  | 'submitted'
  | 'tracking'
  | 'finalized'
  | 'timeout'
  | 'error'

export function useCrossChainSwap() {
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const { switchChainAsync } = useSwitchChain()

  const [status, setStatus] = useState<SwapStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [quotes, setQuotes] = useState<Quote[]>([])

  const execute = useCallback(
    async (request: QuoteRequest) => {
      if (!walletClient || !publicClient) {
        setError('Wallet not connected')
        return
      }

      setError(null)

      try {
        // ── 1. Fetch quotes ──────────────────────────────────────────────────
        setStatus('quoting')
        const response = await aggregator.getQuotes(request)

        if (response.quotes.length === 0) {
          setError('No quotes available')
          setStatus('error')
          return
        }

        setQuotes(response.quotes)
        const quote = response.quotes[0]

        // ── 2. Ensure wallet is on the origin chain ──────────────────────────
        await switchChainAsync({ chainId: request.input.chainId })

        // ── 3. ERC-20 approvals ──────────────────────────────────────────────
        //
        // Some providers (Relay, Bungee, OIF) populate quote.order.checks.allowances
        // with the exact spender and amount. Others (e.g. Across) do not.
        // When checks are missing, derive the approval from the transaction step:
        // the `to` address is the contract that will pull tokens from the user.
        const allowances = quote.order.checks?.allowances ?? []

        if (allowances.length > 0) {
          setStatus('approving')

          for (const allowance of allowances) {
            const { tokenAddress, spender, required } = allowance

            const currentAllowance = await publicClient.readContract({
              address: tokenAddress,
              abi: erc20Abi,
              functionName: 'allowance',
              args: [walletClient.account.address, spender],
            })

            if (currentAllowance < BigInt(required)) {
              const approveHash = await walletClient.writeContract({
                address: tokenAddress,
                abi: erc20Abi,
                functionName: 'approve',
                args: [spender, BigInt(required)],
              })
              await publicClient.waitForTransactionReceipt({ hash: approveHash })
            }
          }
        } else if (
          !isSignatureOnlyOrder(quote.order) &&
          !isNativeAddress(request.input.assetAddress, 'eip155')
        ) {
          // Fallback: provider didn't supply checks (e.g. Across).
          // Approve the transaction target for the quoted input amount.
          setStatus('approving')

          const step = getTransactionSteps(quote.order)[0]
          const spender = step.transaction.to
          const inputPreview = quote.preview.inputs[0]

          const currentAllowance = await publicClient.readContract({
            address: inputPreview.assetAddress as `0x${string}`,
            abi: erc20Abi,
            functionName: 'allowance',
            args: [walletClient.account.address, spender],
          })

          if (currentAllowance < BigInt(inputPreview.amount)) {
            const approveHash = await walletClient.writeContract({
              address: inputPreview.assetAddress as `0x${string}`,
              abi: erc20Abi,
              functionName: 'approve',
              args: [spender, BigInt(inputPreview.amount)],
            })
            await publicClient.waitForTransactionReceipt({ hash: approveHash })
          }
        }

        // ── 4. Submit the order ──────────────────────────────────────────────
        setStatus('submitting')

        let txHash: `0x${string}` | undefined

        if (isSignatureOnlyOrder(quote.order)) {
          // Gasless: sign EIP-712 typed data, solver submits on your behalf
          const step = getSignatureSteps(quote.order)[0]
          const { signatureType, ...typedData } = step.signaturePayload
          const signature = await walletClient.signTypedData(typedData)
          await aggregator.submitOrder(quote, signature)
        } else {
          // User pays gas: send transaction directly
          const step = getTransactionSteps(quote.order)[0]
          const { to, data, value, gas, maxFeePerGas, maxPriorityFeePerGas } =
            step.transaction

          txHash = await walletClient.sendTransaction({
            to,
            data,
            value: value ? BigInt(value) : undefined,
            gas: gas ? BigInt(gas) : undefined,
            maxFeePerGas: maxFeePerGas ? BigInt(maxFeePerGas) : undefined,
            maxPriorityFeePerGas: maxPriorityFeePerGas
              ? BigInt(maxPriorityFeePerGas)
              : undefined,
          })

          await publicClient.waitForTransactionReceipt({ hash: txHash })
        }

        // ── 5. Track until finalized ─────────────────────────────────────────
        setStatus('tracking')

        if (txHash) {
          const tracker = aggregator.track({
            txHash,
            providerId: quote.provider,
            originChainId: request.input.chainId,
            destinationChainId: request.output.chainId,
            timeout: 300_000, // 5 minutes
          })

          tracker.on(OrderStatus.Finalized, () => setStatus('finalized'))
          tracker.on(OrderStatus.Failed, (update) => {
            setError(update.failureReason ?? 'Order failed')
            setStatus('error')
          })
          tracker.on(OrderTrackerEvent.Timeout, () => {
            // The SDK stopped watching but the order may still finalize on-chain
            setStatus('timeout')
          })
          tracker.on(OrderTrackerEvent.Error, (err) => {
            setError(err instanceof Error ? err.message : 'Tracking error')
            setStatus('error')
          })
        } else {
          // Gasless orders have no origin tx hash — the solver submits on-chain.
          // Track by orderId using watchOrder() from a standalone OrderTracker.
          // See the intent-tracking docs for the orderId-based flow.
          setStatus('submitted')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unexpected error')
        setStatus('error')
      }
    },
    [walletClient, publicClient],
  )

  return { execute, status, error, quotes }
}
```

---

## Next steps

-   [Order Tracking](./intent-tracking.md) — detailed event reference and provider-specific notes
-   [Execute Intent](./example.md) — the equivalent Node.js script using `privateKeyToAccount`
-   [Advanced Usage](./advanced-usage.md) — sorting strategies, timeouts, error handling
-   [API Reference](./api.md) — complete function signatures and types
