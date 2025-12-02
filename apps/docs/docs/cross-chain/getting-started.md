---
title: Getting Started
---

The `cross-chain` package provides a standardized interface for interacting with cross-chain bridges and protocols. It enables seamless token transfers and swaps between different blockchain networks through a unified API.

## Key Features

-   Cross-chain token transfers between supported networks
-   Cross-chain token swaps with customizable slippage
-   Quote fetching for cross-chain operations
-   Standardized provider interface for integrating different bridge protocols
-   Type-safe interactions with comprehensive TypeScript support

## Basic Usage

### Creating a Provider

The package uses a factory pattern to create providers for different protocols. Currently supported protocols include:

-   Across Protocol
-   Sample Provider (for testing)

```typescript
import { createCrossChainProvider } from "@wonderland/interop";

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
    inputChainId: "1", // Ethereum mainnet
    outputChainId: "137", // Polygon
    inputTokenAddress: "0x...", // Token address on source chain
    outputTokenAddress: "0x...", // Token address on destination chain
    inputAmount: "1000000000000000000", // 1 token (in wei)
});

// Get a quote for a cross-chain swap
const swapQuote = await acrossProvider.getQuote("crossChainSwap", {
    inputChainId: "1",
    outputChainId: "137",
    inputTokenAddress: "0x...",
    outputTokenAddress: "0x...",
    inputAmount: "1000000000000000000",
    outputAmount: "900000000000000000", // Expected output amount
});
```

### Executing Cross-Chain Operations

After getting a quote, you can simulate and execute the transaction:

```typescript
// Simulate the transaction
const transactions = await acrossProvider.simulateOpen(transferQuote.openParams);

// The transactions array contains the transaction requests that need to be executed
// You can use your preferred wallet or transaction library to send these transactions
```
