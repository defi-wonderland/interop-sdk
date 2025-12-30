---
title: Cross-chain
---

The cross-chain package provides a standardized interface for interacting with cross-chain bridges and protocols. It enables seamless token transfers and swaps between different blockchain networks through a unified API.

## Features

-   Cross-chain token transfers between supported networks
-   Quote fetching and comparison from multiple providers
-   Intent tracking from initiation to completion
-   Support for Across Protocol and OIF (Open Intents Framework)
-   EIP-7683 compliant intent-based architecture

## Quick Start

```typescript
import { createCrossChainProvider } from "@wonderland/interop-cross-chain";

// Create an Across provider
const provider = createCrossChainProvider("across", {
    apiUrl: "https://testnet.across.to/api",
});

// Get a quote for a cross-chain transfer
const quote = await provider.getQuote("crossChainTransfer", {
    sender: "0x...",
    recipient: "0x...",
    inputTokenAddress: "0x...",
    outputTokenAddress: "0x...",
    inputAmount: "1000000000000000000",
    inputChainId: 11155111,
    outputChainId: 84532,
});
```

See the [Getting Started](./cross-chain/getting-started.md) guide for more details.
