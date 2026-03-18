---
title: Getting Started
---

The `cross-chain` package provides a standardized interface for interacting with cross-chain bridges and protocols. It enables seamless token transfers and swaps between different blockchain networks through a unified API.

## Key Features

-   Cross-chain token transfers between supported networks
-   Cross-chain token swaps with customizable slippage
-   Quote fetching for cross-chain operations
-   Order tracking from initiation to completion
-   Multi-provider quote aggregation and comparison
-   Step-based order model (signature and transaction steps)
-   Standardized provider interface for integrating different bridge protocols
-   Type-safe interactions with comprehensive TypeScript support

### Currently Supported Providers

-   **[Across Protocol](./across-provider.md)** - Cross-chain transfers (mainnet + testnet)
-   **[Relay Protocol](./relay-provider.md)** - Cross-chain transfers using Relay bridge (mainnet + testnet)
-   **[OIF (Open Intents Framework)](./oif-provider.md)** - Direct integration with OIF-compliant solvers

> Additional protocols are planned for future releases.

## Installation

```bash
npm install @wonderland/interop-cross-chain
# or
yarn add @wonderland/interop-cross-chain
# or
pnpm add @wonderland/interop-cross-chain
```

## Basic Usage

### Creating a Provider

The package uses a factory pattern to create providers for different protocols:

```typescript
import { createCrossChainProvider } from "@wonderland/interop-cross-chain";

// Create a provider - Across uses sensible defaults
const acrossProvider = createCrossChainProvider("across");

// Or with custom configuration
const testnetProvider = createCrossChainProvider("across", { isTestnet: true });

// Relay - defaults to mainnet
const relayProvider = createCrossChainProvider("relay");

// OIF requires configuration
const oifProvider = createCrossChainProvider("oif", {
    solverId: "my-solver",
    url: "https://solver.example.com",
});
```

See the provider-specific documentation for configuration options:

-   [Across Provider](./across-provider.md)
-   [Relay Provider](./relay-provider.md)
-   [OIF Provider](./oif-provider.md)

### Getting Quotes

All providers support fetching quotes using the SDK `QuoteRequest` format:

```typescript
import type { QuoteRequest } from "@wonderland/interop-cross-chain";

const request: QuoteRequest = {
    user: "0xYourAddress",
    input: {
        chainId: 1,
        assetAddress: "0xInputToken",
        amount: "1000000000000000000", // 1 token (in wei)
    },
    output: {
        chainId: 42161,
        assetAddress: "0xOutputToken",
        recipient: "0xRecipient",
    },
    swapType: "exact-input",
};

const quotes = await provider.getQuotes(request);
const quote = quotes[0]; // Select the first quote
```

### Executing Transactions

After getting a quote, execute based on the order's step type:

```typescript
import {
    getSignatureSteps,
    getTransactionSteps,
    isSignatureOnlyOrder,
} from "@wonderland/interop-cross-chain";

if (isSignatureOnlyOrder(quote.order)) {
    // Protocol mode: sign EIP-712 typed data (gasless for user)
    const step = getSignatureSteps(quote.order)[0];
    const { signatureType, ...typedData } = step.signaturePayload;
    const signature = await walletClient.signTypedData(typedData);
    await provider.submitOrder(quote, signature);
} else {
    // User mode: send transaction directly
    const step = getTransactionSteps(quote.order)[0];
    const hash = await walletClient.sendTransaction({
        to: step.transaction.to,
        data: step.transaction.data,
        value: step.transaction.value ? BigInt(step.transaction.value) : undefined,
    });
    console.log("Transaction sent:", hash);
}
```

### Using Multiple Providers

For comparing quotes across providers, use the `Aggregator`:

```typescript
import { createAggregator } from "@wonderland/interop-cross-chain";

const aggregator = createAggregator({
    providers: [acrossProvider, oifProvider],
});

const response = await aggregator.getQuotes({
    /* QuoteRequest ... */
});
// response.quotes - sorted quotes from all providers
// response.errors - any provider errors
```

See [Advanced Usage](./advanced-usage.md) for sorting strategies and timeout configuration.

## Next Step

Choose a provider to get started:

-   [Across Provider](./across-provider.md) - Cross-chain transfers using Across bridge (testnet)
-   [Relay Provider](./relay-provider.md) - Cross-chain transfers using Relay bridge (mainnet + testnet)
-   [OIF Provider](./oif-provider.md) - Intent-based operations with OIF-compliant solvers
