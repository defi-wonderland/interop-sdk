---
title: Cross-chain
---

The cross-chain package provides a standardized interface for interacting with cross-chain bridges and protocols. It enables seamless token transfers and swaps between different blockchain networks through a unified API.

## Features

-   Cross-chain token transfers between supported networks
-   Quote fetching and comparison from multiple providers
-   Intent tracking from initiation to completion
-   Support for OIF (Open Intents Framework) and Across Protocol
-   EIP-7683 compliant intent-based architecture

## Quick Start

```typescript
import { createCrossChainProvider } from "@wonderland/interop-cross-chain";

// Create an OIF provider
const provider = createCrossChainProvider(
    "oif",
    {
        solverId: "my-solver",
        url: "https://oif-api.example.com",
    },
    {},
);

// Get quotes for a cross-chain transfer
const quotes = await provider.getQuotes({
    user: USER_INTEROP_ADDRESS, // user's interop address (binary format)
    intent: {
        intentType: "oif-swap",
        inputs: [
            {
                user: USER_INTEROP_ADDRESS,
                asset: INPUT_TOKEN_ADDRESS,
                amount: "1000000000000000000",
            },
        ],
        outputs: [{ receiver: RECEIVER_INTEROP_ADDRESS, asset: OUTPUT_TOKEN_ADDRESS }],
        swapType: "exact-input",
    },
    supportedTypes: ["oif-escrow-v0"],
});
```

For Across Protocol integration, see the [Across Provider](./cross-chain/across-provider.md) guide.

See the [Getting Started](./cross-chain/getting-started.md) guide for more details.
