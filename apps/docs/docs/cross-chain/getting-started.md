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

Currently Supported Providers
- Production Ready: Across Protocol - Full support for cross-chain transfers
- Testing Only: Sample Provider - For testing and development purposes

>Currently, only Across Protocol is production-ready. Additional protocols are planned for future releases.

## Basic Usage
### Installing the Package

```bash
npm install @defi-wonderland/interop-cross-chain
# or
yarn add @defi-wonderland/interop-cross-chain
# or
pnpm add @defi-wonderland/interop-cross-chain
```

### Creating a Provider

The package uses a factory pattern to create providers for different protocols. Currently supported protocols include:

-   Across Protocol
-   Sample Provider (for testing)

```typescript
import { createCrossChainProvider } from "@defi-wonderland/interop-cross-chain";

// Create an Across provider (no config or dependencies needed)
const acrossProvider = createCrossChainProvider("across");

// Create a sample provider (for testing)
const sampleProvider = createCrossChainProvider("sample-protocol");
```

### Getting Quotes

You can get quotes for cross-chain transfers and swaps:

```typescript
// Get a quote for a cross-chain transfer
const transferQuote = await acrossProvider.getQuote("crossChainTransfer", {
    sender: "0x...", // sender address (hex)
    recipient: "0x...", // recipient address (hex)
    inputTokenAddress: "0x...", // Token address on source chain
    outputTokenAddress: "0x...", // Token address on destination chain
    inputAmount: "1000000000000000000", // 1 token (in wei)
    inputChainId: 11155111, // source chain ID (number)
    outputChainId: 84532, // destination chain ID (number)
});
```

>Currently, Across Protocol only supports `crossChainTransfer`. Cross-chain swaps are planned for future releases.

### Executing Cross-Chain Operations

After getting a quote, you can simulate and execute the transaction:

```typescript
// Simulate the transaction
const transactions = await acrossProvider.simulateOpen(transferQuote.openParams);

// The transactions array contains the transaction requests that need to be executed
// You can use your preferred wallet or transaction library to send these transactions
```

## Next Steps

-   Learn about [Intent Tracking](./intent-tracking.md) to monitor cross-chain transfers
-   Use [Quote Aggregator](./quote-aggregator.md) to compare quotes from multiple providers
-   Check the [API Reference](./api.md) for detailed method documentation
-   See [Advanced Usage](./advanced-usage.md) for complex scenarios