---
title: Getting Started
---

The `cross-chain` package provides a standardized interface for interacting with cross-chain bridges and protocols. It enables seamless token transfers and swaps between different blockchain networks through a unified API.

## Key Features

-   Cross-chain token transfers between supported networks
-   Cross-chain token swaps with customizable slippage
-   Quote fetching for cross-chain operations
-   Intent tracking from initiation to completion
-   Multi-provider quote aggregation and comparison
-   Standardized provider interface for integrating different bridge protocols
-   Type-safe interactions with comprehensive TypeScript support

### Currently Supported Providers

-   **[Across Protocol](./across-provider.md)** - Cross-chain transfers (testnet)
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

// Create a provider for a specific protocol
const provider = createCrossChainProvider(
    "protocol-name",
    {
        // provider-specific configuration
    },
    {}, // dependencies
);
```

See the provider-specific documentation for configuration options:

-   [Across Provider](./across-provider.md)
-   [OIF Provider](./oif-provider.md)

### Getting Quotes

All providers support fetching quotes for cross-chain operations using the OIF format:

```typescript
const quotes = await provider.getQuotes({
    user: USER_INTEROP_ADDRESS, // user's interop address (binary format)
    intent: {
        intentType: "oif-swap",
        inputs: [
            {
                user: USER_INTEROP_ADDRESS, // sender's interop address (binary format)
                asset: INPUT_TOKEN_INTEROP_ADDRESS, // input token interop address (binary format)
                amount: "1000000000000000000", // 1 token (in wei)
            },
        ],
        outputs: [
            {
                receiver: RECEIVER_INTEROP_ADDRESS, // recipient's interop address (binary format)
                asset: OUTPUT_TOKEN_INTEROP_ADDRESS, // output token interop address (binary format)
            },
        ],
        swapType: "exact-input",
    },
    supportedTypes: ["oif-escrow-v0"], // or provider-specific types
});

const quote = quotes[0]; // Select the first quote
```

### Executing Transactions

After getting a quote, execute the transaction using the prepared transaction:

```typescript
if (quote.preparedTransaction) {
    const hash = await walletClient.sendTransaction(quote.preparedTransaction);
    console.log("Transaction sent:", hash);
}
```

### Using Multiple Providers

For comparing quotes across providers, use the `ProviderExecutor`:

```typescript
import { createProviderExecutor } from "@wonderland/interop-cross-chain";

const executor = createProviderExecutor({
    providers: [acrossProvider, oifProvider],
});

const response = await executor.getQuotes({
    /* ... */
});
// response.quotes - sorted quotes from all providers
// response.errors - any provider errors
```

See [Advanced Usage](./advanced-usage.md) for sorting strategies and timeout configuration.

## Next Step

Choose a provider to get started:

-   [Across Provider](./across-provider.md) - Cross-chain transfers using Across bridge (testnet)
-   [OIF Provider](./oif-provider.md) - Intent-based operations with OIF-compliant solvers
