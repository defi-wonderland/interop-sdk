---
title: Advanced Usage
---

## Provider Executor

For complex scenarios, use the ProviderExecutor to manage multiple providers with sorting, timeout handling, and built-in intent tracking.

### Minimal Setup

```typescript
import { createCrossChainProvider, createProviderExecutor } from "@wonderland/interop-cross-chain";

const acrossProvider = createCrossChainProvider(
    "across",
    { apiUrl: "https://testnet.across.to/api" },
    {},
);

const executor = createProviderExecutor({
    providers: [acrossProvider],
});
```

### Full Configuration

```typescript
import {
    createCrossChainProvider,
    createProviderExecutor,
    IntentTrackerFactory,
    SortingStrategyFactory,
} from "@wonderland/interop-cross-chain";

const acrossProvider = createCrossChainProvider(
    "across",
    { apiUrl: "https://testnet.across.to/api" },
    {},
);

const executor = createProviderExecutor({
    providers: [acrossProvider],
    sortingStrategy: SortingStrategyFactory.createStrategy("bestOutput"),
    timeoutMs: 15000,
    trackerFactory: new IntentTrackerFactory({
        rpcUrls: {
            11155111: "https://sepolia.infura.io/v3/YOUR_API_KEY",
            84532: "https://base-sepolia.g.alchemy.com/v2/YOUR_API_KEY",
        },
    }),
});

// Get quotes from all providers
const response = await executor.getQuotes({
    user: USER_INTEROP_ADDRESS, // user's interop address (binary format)
    intent: {
        intentType: "oif-swap",
        inputs: [
            {
                user: USER_INTEROP_ADDRESS, // sender's interop address (binary format)
                asset: INPUT_TOKEN_INTEROP_ADDRESS, // input token interop address (binary format)
                amount: "1000000000000000000",
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
    supportedTypes: ["across"],
});

// Handle results
if (response.quotes.length > 0) {
    const bestQuote = response.quotes[0];
    console.log(`Best quote from ${bestQuote.provider}`);
}

response.errors.forEach((error) => {
    console.error(`Error: ${error.errorMsg}`);
});
```

For more details on the Provider Executor configuration, see the [API Reference](./api.md#provider-executor).

## Intent Tracking

The executor includes built-in intent tracking when configured with a `trackerFactory`. After executing a transaction, use `executor.track()` to monitor the cross-chain transfer:

```typescript
// Execute the transaction
const quote = response.quotes[0];
const hash = await walletClient.sendTransaction(quote.preparedTransaction);

// Track with real-time events
const tracker = executor.track({
    txHash: hash,
    providerId: quote.provider, // e.g., "across"
    originChainId: 11155111,
    destinationChainId: 84532,
    timeout: 300000, // 5 minutes
});

tracker.on("opened", (update) => console.log("Order opened:", update.orderId));
tracker.on("filled", (update) => console.log("Filled!", update.fillTxHash));
tracker.on("expired", (update) => console.log("Transfer expired"));
tracker.on("error", (error) => console.error("Tracking error:", error));
```

### One-Time Status Check

For a simple status check without event-based tracking:

```typescript
const status = await executor.getIntentStatus({
    txHash: "0x...",
    providerId: "across",
    originChainId: 11155111,
});

console.log(status.status); // 'opening' | 'opened' | 'filling' | 'filled' | 'expired'
if (status.fillEvent) {
    console.log(`Filled by: ${status.fillEvent.relayer}`);
}
```

For more details, see [Intent Tracking](./intent-tracking.md).

## Error Handling

The package includes specific error types for better error handling:

```typescript
import {
    ProviderGetQuoteFailure,
    ProviderNotFound,
    ProviderTimeout,
    UnsupportedAction,
    UnsupportedChainId,
    UnsupportedProtocol,
} from "@wonderland/interop-cross-chain";

try {
    const response = await executor.getQuotes({
        /* ... */
    });
} catch (error) {
    if (error instanceof UnsupportedProtocol) {
        console.error("Protocol not supported");
    } else if (error instanceof UnsupportedChainId) {
        console.error("Chain ID not supported");
    } else if (error instanceof ProviderNotFound) {
        console.error("Provider not found");
    } else if (error instanceof ProviderGetQuoteFailure) {
        console.error("Failed to get quote:", error.message);
    } else if (error instanceof ProviderTimeout) {
        console.error("Request timed out");
    }
}
```

## Best Practices

1. Always check both `quotes` and `errors` in the executor response
2. Use sorting strategies to get the best quotes first
3. Use Intent Tracker to monitor cross-chain transfers
4. Handle errors appropriately using the provided error types
5. Set appropriate timeouts for quote requests
6. Test your implementation on testnet before moving to production
7. Provide custom RPC URLs for better reliability

## Reference

For detailed method documentation, see the [API Reference](./api.md).
