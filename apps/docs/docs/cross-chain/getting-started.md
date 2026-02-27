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
-   Standardized provider interface for integrating different bridge protocols
-   Type-safe interactions with comprehensive TypeScript support

### Currently Supported Providers

-   **[Across Protocol](./across-provider.md)** - Cross-chain transfers (mainnet + testnet)
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

// OIF requires configuration
const oifProvider = createCrossChainProvider("oif", {
    solverId: "my-solver",
    url: "https://solver.example.com",
});
```

See the provider-specific documentation for configuration options:

-   [Across Provider](./across-provider.md)
-   [OIF Provider](./oif-provider.md)

### Getting Quotes

Use the `Aggregator` to fetch quotes from one or more providers. The `user` is a plain EVM address, and `input`/`output` are at the top level:

```typescript
import type { QuoteRequest } from "@wonderland/interop-cross-chain";
import { createAggregator } from "@wonderland/interop-cross-chain";

const aggregator = createAggregator({
    providers: [acrossProvider, oifProvider],
});

const response = await aggregator.getQuotes({
    user: "0xYourAddress...",
    input: {
        asset: { chainId: 11155111, address: "0xInputToken..." },
        amount: "1000000000000000000", // 1 token (in smallest unit)
    },
    output: {
        asset: { chainId: 84532, address: "0xOutputToken..." },
    },
    swapType: "exact-input",
});

// response.quotes — sorted quotes from all providers
// response.errors — any provider errors
const quote = response.quotes[0];
```

### Executing Orders

Quotes return a step-based `order` describing what the user must do. Each step is either a **signature** (sign EIP-712 typed data) or a **transaction** (send a tx on-chain):

```typescript
const step = quote.order.steps[0];

if (step.kind === "signature") {
    // Protocol mode (gasless): sign and submit to solver
    const { signatureType, ...typedData } = step.signaturePayload;
    const signature = await walletClient.signTypedData(typedData);
    await aggregator.submitOrder(quote, signature);
} else if (step.kind === "transaction") {
    // User mode: send the transaction directly
    const hash = await walletClient.sendTransaction({
        to: step.transaction.to,
        data: step.transaction.data,
        ...(step.transaction.value && { value: BigInt(step.transaction.value) }),
    });
    console.log("Transaction sent:", hash);
}
```

See [Advanced Usage](./advanced-usage.md) for sorting strategies and timeout configuration.

## Next Step

Choose a provider to get started:

-   [Across Provider](./across-provider.md) - Cross-chain transfers using Across bridge (testnet)
-   [OIF Provider](./oif-provider.md) - Intent-based operations with OIF-compliant solvers
