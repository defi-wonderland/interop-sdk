---
title: Advanced Usage
---

## Aggregator

For complex scenarios, use the Aggregator to manage multiple providers with sorting, timeout handling, and built-in order tracking.

### Minimal Setup

```typescript
import { createAggregator, createCrossChainProvider } from "@wonderland/interop-cross-chain";

const acrossProvider = createCrossChainProvider("across", { isTestnet: true });

const aggregator = createAggregator({
    providers: [acrossProvider],
});
```

### Full Configuration

```typescript
import type { QuoteRequest } from "@wonderland/interop-cross-chain";
import {
    createAggregator,
    createCrossChainProvider,
    OrderTrackerFactory,
    SortingStrategyFactory,
} from "@wonderland/interop-cross-chain";

const acrossProvider = createCrossChainProvider("across", { isTestnet: true });

const aggregator = createAggregator({
    providers: [acrossProvider],
    sortingStrategy: SortingStrategyFactory.createStrategy("bestOutput"),
    timeoutMs: 15000,
    trackerFactory: new OrderTrackerFactory({
        rpcUrls: {
            11155111: "https://sepolia.infura.io/v3/YOUR_API_KEY",
            84532: "https://base-sepolia.g.alchemy.com/v2/YOUR_API_KEY",
        },
    }),
});

// Get quotes from all providers
const response = await aggregator.getQuotes({
    user: "0xYourAddress",
    input: {
        chainId: 11155111,
        assetAddress: "0xInputToken",
        amount: "1000000000000000000",
    },
    output: {
        chainId: 84532,
        assetAddress: "0xOutputToken",
        recipient: "0xRecipient",
    },
    swapType: "exact-input",
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

For more details on the Aggregator configuration, see the [API Reference](./api.md#aggregator).

## Order Tracking

The aggregator includes built-in order tracking when configured with a `trackerFactory`. After executing a transaction, use `aggregator.track()` to monitor the cross-chain transfer:

```typescript
import {
    getTransactionSteps,
    OrderStatus,
    OrderTrackerEvent,
} from "@wonderland/interop-cross-chain";

// Execute the transaction
const quote = response.quotes[0];
const step = getTransactionSteps(quote.order)[0];
const hash = await walletClient.sendTransaction({
    to: step.transaction.to,
    data: step.transaction.data,
    value: step.transaction.value ? BigInt(step.transaction.value) : undefined,
});

// Track with real-time events
const tracker = aggregator.track({
    txHash: hash,
    providerId: quote.provider, // e.g., "across"
    originChainId: 11155111,
    destinationChainId: 84532,
    timeout: 300000, // 5 minutes
});

tracker.on(OrderStatus.Pending, (update) => console.log("Pending:", update.message));
tracker.on(OrderStatus.Finalized, (update) => console.log("Finalized!", update.fillTxHash));
tracker.on(OrderStatus.Failed, (update) => console.log("Failed:", update.failureReason));
tracker.on(OrderTrackerEvent.Timeout, (payload) => console.log("Timeout:", payload.message));
tracker.on(OrderTrackerEvent.Error, (error) => console.error("Tracking error:", error));
```

### One-Time Status Check

For a simple status check without event-based tracking:

```typescript
const status = await aggregator.getOrderStatus({
    txHash: "0x...",
    providerId: "across",
    originChainId: 11155111,
});

console.log(status.status); // OrderStatus
if (status.fillEvent) {
    console.log(`Filled by: ${status.fillEvent.relayer}`);
}
```

For more details, see [Order Tracking](./intent-tracking.md).

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
    const response = await aggregator.getQuotes({
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

1. Always check both `quotes` and `errors` in the aggregator response
2. Use sorting strategies to get the best quotes first
3. Use `OrderTracker` to monitor cross-chain transfers
4. Handle errors appropriately using the provided error types
5. Set appropriate timeouts for quote requests
6. Test your implementation on testnet before moving to production
7. Provide custom RPC URLs for better reliability

## Reference

For detailed method documentation, see the [API Reference](./api.md).
