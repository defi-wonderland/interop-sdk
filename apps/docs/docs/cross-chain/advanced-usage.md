---
title: Advanced Usage
---

## Provider Executor

For more complex scenarios, you can use the ProviderExecutor to manage multiple providers:

```typescript
import { createCrossChainProvider, createProviderExecutor } from "@wonderland/interop-cross-chain";

const acrossProvider = createCrossChainProvider("across");
const executor = createProviderExecutor([acrossProvider]);

// The executor can be used to get quotes from multiple providers
// and execute transactions across different protocols
const quotes = await executor.getQuotes("crossChainTransfer", {
    sender: "0x...",
    recipient: "0x...",
    inputTokenAddress: "0x...",
    outputTokenAddress: "0x...",
    inputAmount: "1000000000000000000",
    inputChainId: 11155111,
    outputChainId: 84532,
});
```

## Quote Aggregator

The Quote Aggregator allows you to fetch quotes from multiple providers in parallel, with automatic sorting and timeout handling:

```typescript
import {
    createQuoteAggregator,
    QuoteResultStatus,
    SortingCriteria,
} from "@wonderland/interop-cross-chain";

// Create aggregator with specific providers
const aggregator = createQuoteAggregator(["across"]);

// Get sorted quotes
const results = await aggregator.getQuotes({
    action: "crossChainTransfer",
    params: {
        sender: "0x...",
        recipient: "0x...",
        inputTokenAddress: "0x...",
        outputTokenAddress: "0x...",
        inputAmount: "1000000000000000000",
        inputChainId: 11155111,
        outputChainId: 84532,
    },
    sorting: SortingCriteria.BEST_OUTPUT, // Optional: BEST_OUTPUT, LOWEST_FEE_AMOUNT, LOWEST_FEE_PERCENT
    timeout: 10000, // Optional: timeout in milliseconds (default: 10000)
});

// Check results
results.forEach((result) => {
    if (result.status === QuoteResultStatus.SUCCESS) {
        console.log(`${result.provider}: ${result.quote.output.outputAmount}`);
        console.log(`Fee: ${result.quote.fee.percent}%`);
    } else {
        console.log(`${result.provider}: ${result.status} - ${result.error}`);
    }
});

// Use the best quote (first successful result)
const bestQuote = results.find((r) => r.status === QuoteResultStatus.SUCCESS);
if (bestQuote?.quote) {
    console.log(`Best quote from ${bestQuote.provider}`);
    // Use bestQuote.quote to execute the transaction (see Complete Workflow Example below)
}
```

### Custom Sorting

You can also provide a custom sorting function:

```typescript
const results = await aggregator.getQuotes({
    action: "crossChainTransfer",
    params: {
        /* ... */
    },
    sorting: (a, b) => {
        if (!a.quote || !b.quote) return 0;
        // Custom sorting logic
        const aOutput = BigInt(a.quote.output.outputAmount);
        const bOutput = BigInt(b.quote.output.outputAmount);
        return aOutput > bOutput ? -1 : aOutput < bOutput ? 1 : 0;
    },
});
```

## Intent Tracking

Track cross-chain transfers from initiation to completion:

```typescript
import { createIntentTracker } from "@wonderland/interop-cross-chain";

// NOTE: This example relies on ERC-7683 events, which are currently only
// emitted by Across on testnet. The watched contract is therefore hardcoded here.
const tracker = createIntentTracker("across");

// Watch an intent with real-time updates
for await (const update of tracker.watchIntent({
    txHash: "0x...",
    originChainId: 11155111,
    destinationChainId: 84532,
    timeout: 300000, // 5 minutes
})) {
    console.log(`[${update.status}] ${update.message}`);

    if (update.status === "filled") {
        console.log(`Filled in tx: ${update.fillTxHash}`);
        break;
    } else if (update.status === "expired") {
        console.log("Transfer expired");
        break;
    }
}

// Or get current status without watching
const status = await tracker.getIntentStatus("0x...", 11155111);
console.log(status.status); // 'opening' | 'opened' | 'filling' | 'filled' | 'expired'
if (status.fillEvent) {
    console.log(`Filled by: ${status.fillEvent.relayer}`);
}
```

## Error Handling

The package includes specific error types for better error handling:

```typescript
import {
    UnsupportedAction,
    UnsupportedChainId,
    UnsupportedProtocol,
} from "@wonderland/interop-cross-chain";

try {
    // Your cross-chain operations here
} catch (error) {
    if (error instanceof UnsupportedProtocol) {
        // Handle unsupported protocol error
    } else if (error instanceof UnsupportedAction) {
        // Handle unsupported action error
    } else if (error instanceof UnsupportedChainId) {
        // Handle unsupported chain ID error
    }
}
```

## Best Practices

1. Always validate quotes before executing transactions
2. Use Quote Aggregator to compare quotes from multiple providers
3. Use Intent Tracker to monitor cross-chain transfers
4. Handle errors appropriately using the provided error types
5. Set appropriate timeouts for quote requests
6. Test your implementation using the sample provider before moving to production

## Supported Actions

The package supports two main actions:

1. `crossChainTransfer`: Transfer tokens between different chains
2. `crossChainSwap`: Swap tokens between different chains
