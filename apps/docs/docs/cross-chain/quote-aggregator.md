---
title: Quote Aggregator
---

The Quote Aggregator allows you to fetch quotes from multiple cross-chain providers simultaneously, with automatic sorting, timeout handling, and error management. This is useful for comparing rates across different protocols and selecting the best option.

## Overview

The Quote Aggregator:

- Fetches quotes from multiple providers in parallel
- Handles timeouts gracefully per provider
- Sorts quotes by configurable criteria
- Separates successful quotes from errors
- Provides detailed error information

## Installation

```bash
npm install @wonderland/interop-cross-chain
# or
yarn add @wonderland/interop-cross-chain
# or
pnpm add @wonderland/interop-cross-chain
```

## Basic Usage

### Creating a Quote Aggregator

```typescript
import { createQuoteAggregator } from "@wonderland/interop-cross-chain";

// Create aggregator with default provider (Across)
const aggregator = createQuoteAggregator();

// Or specify providers explicitly
const aggregator = createQuoteAggregator(["across"]);
```

### Fetching Quotes

Get quotes from all configured providers:

```typescript
import { 
    createQuoteAggregator,
    SortingCriteria,
    QuoteResultStatus
} from "@wonderland/interop-cross-chain";

const aggregator = createQuoteAggregator(["across"]);

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
    sorting: SortingCriteria.BEST_OUTPUT, // Optional
    timeout: 10000, // Optional, in milliseconds (default: 10000)
});

// Check results
results.forEach(result => {
    if (result.status === QuoteResultStatus.SUCCESS) {
        console.log(`${result.provider}: ${result.quote.output.outputAmount}`);
        console.log(`Fee: ${result.quote.fee.percent}%`);
    } else {
        console.log(`${result.provider}: ${result.status} - ${result.error}`);
    }
});
```

## Sorting Criteria

The aggregator supports three predefined sorting strategies:

### BEST_OUTPUT (Default)

Sorts by highest output amount:

```typescript
const results = await aggregator.getQuotes({
    action: "crossChainTransfer",
    params: { /* ... */ },
    sorting: SortingCriteria.BEST_OUTPUT,
});
```

### LOWEST_FEE_AMOUNT

Sorts by lowest absolute fee:

```typescript
const results = await aggregator.getQuotes({
    action: "crossChainTransfer",
    params: { /* ... */ },
    sorting: SortingCriteria.LOWEST_FEE_AMOUNT,
});
```

### LOWEST_FEE_PERCENT

Sorts by lowest fee percentage:

```typescript
const results = await aggregator.getQuotes({
    action: "crossChainTransfer",
    params: { /* ... */ },
    sorting: SortingCriteria.LOWEST_FEE_PERCENT,
});
```

## Custom Sorting

You can provide a custom sorting function:

```typescript
const results = await aggregator.getQuotes({
    action: "crossChainTransfer",
    params: { /* ... */ },
    sorting: (a, b) => {
        if (!a.quote || !b.quote) return 0;
        
        // Custom sorting logic
        const aOutput = BigInt(a.quote.output.outputAmount);
        const bOutput = BigInt(b.quote.output.outputAmount);
        
        // Sort by output amount descending
        return aOutput > bOutput ? -1 : aOutput < bOutput ? 1 : 0;
    },
});
```

## Handling Results

### Successful Quotes

```typescript
import { QuoteResultStatus } from "@wonderland/interop-cross-chain";

const results = await aggregator.getQuotes({
    action: "crossChainTransfer",
    params: { /* ... */ },
});

// Find successful quotes
const successfulQuotes = results.filter(r => r.status === QuoteResultStatus.SUCCESS);

if (successfulQuotes.length > 0) {
    const bestQuote = successfulQuotes[0]; // Already sorted
    console.log(`Best provider: ${bestQuote.provider}`);
    console.log(`Output amount: ${bestQuote.quote.output.outputAmount}`);
    console.log(`Fee: ${bestQuote.quote.fee.percent}%`);
}
```

### Errors and Timeouts

```typescript
import { QuoteResultStatus } from "@wonderland/interop-cross-chain";

const results = await aggregator.getQuotes({
    action: "crossChainTransfer",
    params: { /* ... */ },
});

results.forEach(result => {
    if (result.status === QuoteResultStatus.SUCCESS) {
        // Handle successful quote
    } else if (result.status === QuoteResultStatus.ERROR) {
        console.error(`${result.provider} error: ${result.error}`);
    } else if (result.status === QuoteResultStatus.TIMEOUT) {
        console.warn(`${result.provider} timed out`);
    }
});
```

Each provider request will timeout independently, so slow providers won't block others.

## Best Practices

1. **Set appropriate timeouts**: Balance between waiting for quotes and user experience
2. **Handle all result statuses**: Check for success, error, and timeout states
3. **Compare multiple providers**: Use aggregator to get quotes from all available providers
4. **Sort by your needs**: Choose sorting criteria that matches your use case
5. **Fallback handling**: Always have a fallback if no quotes are available

## Comparison with ProviderExecutor

The Quote Aggregator and ProviderExecutor serve different purposes:

| Feature | Quote Aggregator | ProviderExecutor |
|---------|-----------------|------------------|
| **Focus** | Quote fetching and comparison | Quote fetching and execution |
| **Sorting** | Built-in sorting strategies | Manual sorting required |
| **Timeout** | Per-provider timeout handling | No timeout handling |
| **Error Handling** | Graceful error handling per provider | Throws errors |
| **Use Case** | Compare quotes, find best rate | Execute specific quotes |

Use Quote Aggregator when you need to compare quotes and find the best option. Use ProviderExecutor when you already know which quote to execute.

## References

-   [API Reference](./api.md#quote-aggregator)
-   [Provider Executor](./advanced-usage.md#provider-executor)

