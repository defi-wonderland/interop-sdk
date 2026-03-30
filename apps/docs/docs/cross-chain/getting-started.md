---
title: Getting Started
---

In this tutorial, you'll execute a cross-chain token transfer using the Interop SDK. By the end, you'll know how to create a provider, fetch a quote, and send a transaction.

## Prerequisites

-   Node.js v20.x or higher
-   A private key with testnet funds
-   An RPC URL for your origin chain (e.g., Sepolia)

## Install the package

```bash
npm install @wonderland/interop-cross-chain
# or
yarn add @wonderland/interop-cross-chain
# or
pnpm add @wonderland/interop-cross-chain
```

## Create a provider

The SDK uses a factory pattern. Let's start with Relay on testnet:

```typescript
import { createCrossChainProvider } from "@wonderland/interop-cross-chain";

const provider = createCrossChainProvider("relay", { isTestnet: true });
```

Other available providers: [Across](./across-provider.md), [OIF](./oif-provider.md). See [Supported Providers](./providers.md) for the full list.

## Set up your wallet

You'll need [viem](https://viem.sh) clients to interact with the blockchain:

```typescript
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

const account = privateKeyToAccount("0xYOUR_PRIVATE_KEY");
const RPC_URL = "https://sepolia.infura.io/v3/YOUR_API_KEY";

const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(RPC_URL),
});

const walletClient = createWalletClient({
    chain: sepolia,
    transport: http(RPC_URL),
    account,
});
```

## Fetch a quote

Request a quote for a cross-chain transfer:

```typescript
const quotes = await provider.getQuotes({
    user: account.address,
    input: {
        chainId: 11155111, // Sepolia
        assetAddress: "0xInputTokenAddress",
        amount: "100000000000000000", // 0.1 tokens in wei
    },
    output: {
        chainId: 84532, // Base Sepolia
        assetAddress: "0xOutputTokenAddress",
        recipient: account.address,
    },
    swapType: "exact-input",
});

const quote = quotes[0];
console.log(`Quote from ${quote.provider}`);
```

## Execute the transaction

Quotes contain either signature steps (gasless) or transaction steps (user pays gas). Handle both:

```typescript
import {
    getSignatureSteps,
    getTransactionSteps,
    isSignatureOnlyOrder,
} from "@wonderland/interop-cross-chain";

if (isSignatureOnlyOrder(quote.order)) {
    // Gasless: sign EIP-712 typed data, solver executes on your behalf
    const step = getSignatureSteps(quote.order)[0];
    const { signatureType, ...typedData } = step.signaturePayload;
    const signature = await walletClient.signTypedData(typedData);
    await provider.submitOrder(quote, signature);
    console.log("Order submitted via signature");
} else {
    // User pays gas: send the transaction directly
    const step = getTransactionSteps(quote.order)[0];
    const hash = await walletClient.sendTransaction({
        to: step.transaction.to,
        data: step.transaction.data,
        value: step.transaction.value ? BigInt(step.transaction.value) : undefined,
    });
    console.log("Transaction sent:", hash);

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log("Confirmed:", receipt.status);
}
```

## Compare quotes from multiple providers

Use the `Aggregator` to fetch and sort quotes from multiple providers at once:

```typescript
import { createAggregator, createCrossChainProvider } from "@wonderland/interop-cross-chain";

const acrossProvider = createCrossChainProvider("across", { isTestnet: true });

const aggregator = createAggregator({
    providers: [provider, acrossProvider],
});

const response = await aggregator.getQuotes({
    /* same QuoteRequest as above */
});

console.log(`Got ${response.quotes.length} quotes`);
response.errors.forEach((err) => console.warn(`Provider error: ${err.errorMsg}`));
```

## Quick reference

### Execution flow

1. **Create provider** → `createCrossChainProvider("across")` (or use `createAggregator` for multiple)
2. **Get quotes** → `provider.getQuotes(request)` or `aggregator.getQuotes(request)`
3. **Check order type** → `isSignatureOnlyOrder(quote.order)`
    - **Signature (gasless):** `signTypedData()` → `provider.submitOrder(quote, signature)`
    - **Transaction (user pays gas):** `walletClient.sendTransaction(step.transaction)`
4. **Track** → `aggregator.track({ txHash, providerId, originChainId, destinationChainId })`

### Which function should I use?

| I want to...                            | Use                                                            |
| --------------------------------------- | -------------------------------------------------------------- |
| Get quotes from one provider            | `provider.getQuotes(request)`                                  |
| Get quotes from multiple providers      | `aggregator.getQuotes(request)`                                |
| Build a quote locally (no provider API) | `aggregator.buildQuote(providerId, request)`                   |
| Submit a signed order                   | `provider.submitOrder(quote, signature)`                       |
| Check if order is gasless               | `isSignatureOnlyOrder(quote.order)`                            |
| Get signature steps from an order       | `getSignatureSteps(quote.order)`                               |
| Get transaction steps from an order     | `getTransactionSteps(quote.order)`                             |
| Track an order after submission         | `aggregator.track({ txHash, providerId, originChainId, ... })` |
| Discover supported tokens               | `aggregator.discoverAssets()`                                  |

## Next steps

-   [Order Tracking](./intent-tracking.md) — monitor your transfer from initiation to completion
-   [Supported Providers](./providers.md) — all providers and their configuration options
-   [Concepts](./concepts.md) — understand intent-based architecture and EIP-7683
-   [Advanced Usage](./advanced-usage.md) — sorting strategies, timeouts, error handling
-   [API Reference](./api.md) — complete function signatures and types
