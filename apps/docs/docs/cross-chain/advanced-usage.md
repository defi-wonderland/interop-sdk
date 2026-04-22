---
title: Advanced Usage
---

## Aggregator

For complex scenarios, use the Aggregator to manage multiple providers with sorting, timeout handling, and built-in order tracking.

### Minimal Setup

```typescript
import {
    createAggregator,
    createCrossChainProvider,
    PROTOCOLS,
} from "@wonderland/interop-cross-chain";

const acrossProvider = createCrossChainProvider(PROTOCOLS.ACROSS, { isTestnet: true });

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
    PROTOCOLS,
    SortingStrategyFactory,
} from "@wonderland/interop-cross-chain";

const acrossProvider = createCrossChainProvider(PROTOCOLS.ACROSS, { isTestnet: true });

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

## Automatic ERC-20 Approvals

When ERC-20 inputs need an `approve` before the transfer, the aggregator can handle it for you. Pass an `approvalService` to `createAggregator` and every quote it returns already has the necessary `approve` `TransactionStep`s prepended to `order.steps`. If the user already holds sufficient allowance, nothing is prepended.

```typescript
import {
    createAggregator,
    createApprovalService,
    createCrossChainProvider,
    PROTOCOLS,
} from "@wonderland/interop-cross-chain";

const relayProvider = createCrossChainProvider(PROTOCOLS.RELAY);

const approvalService = createApprovalService({
    rpcUrls: {
        1: "https://mainnet.infura.io/v3/YOUR_API_KEY",
        8453: "https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY",
    },
});

const aggregator = createAggregator({
    providers: [relayProvider],
    approvalService,
});

// Every quote returned now has approval steps prepended when needed.
const response = await aggregator.getQuotes({
    /* ... */
});
```

### Picking a client source

`createApprovalService` has three ways to reach the chain:

-   **No config** (`createApprovalService()`) — the service falls back to viem's default public transport for each chain. Fine for quick experiments; public endpoints are rate-limited and should not be used in production.
-   **`rpcUrls`** — a `Record<number, string>` keyed by chain ID. The right choice for multichain apps: the service reads allowances on the input chain of each quote, so every origin chain you intend to bridge from needs an entry.
-   **`publicClient`** — a pre-configured viem `PublicClient`. Takes precedence over `rpcUrls` and is used for **every** chain the service is asked about, so it only makes sense when every quote originates on the same chain (e.g. a checkout that only accepts USDC on mainnet). Passing a single-chain client into a multichain service will send `multicall` traffic for the wrong network.

Because approval steps live inside the normal `order.steps` array, your execution loop does not need a separate approval code path — iterate the steps in order and each `approve` fires before the transfer step that needs it.

Approval steps carry `approval: true` on the `TransactionStep`. Use the `isApprovalStep` helper to tell them apart from transfer steps when you need different UI states:

```typescript
import { getTransactionSteps, isApprovalStep } from "@wonderland/interop-cross-chain";

for (const step of getTransactionSteps(quote.order)) {
    console.log(isApprovalStep(step) ? "Approving token…" : "Sending bridge tx…");

    const hash = await walletClient.sendTransaction({
        to: step.transaction.to,
        data: step.transaction.data,
        value: step.transaction.value ? BigInt(step.transaction.value) : undefined,
    });
    await publicClient.waitForTransactionReceipt({ hash });
}
```

### Choosing an amount strategy

`ApprovalAmountStrategy` decides the amount encoded in each generated `approve`. Two implementations ship with the SDK:

-   **`ExactAmountStrategy`** (default): approves exactly `required`. Smallest allowance footprint — one `approve` per order against the same `(token, spender)` pair.
-   **`InfiniteAmountStrategy`**: approves `type(uint256).max`. The first order grants an unbounded allowance and later orders for the same pair skip the approval step entirely, at the cost of an unbounded allowance to the spender.

```typescript
import { createApprovalService, InfiniteAmountStrategy } from "@wonderland/interop-cross-chain";

const approvalService = createApprovalService({
    rpcUrls,
    amountStrategy: new InfiniteAmountStrategy(),
});
```

You can also supply your own strategy by implementing the `ApprovalAmountStrategy` interface — for example, a capped-allowance strategy that approves `min(required * 10, cap)`.

### Failure handling

The service is best-effort. Allowance reads run through `MulticallAllowanceReader`, which batches one `multicall` per chain so a failure on one chain never affects reads on another. When a whole batch fails (RPC down, chain unknown to viem), the affected quotes pass through unmodified. Without an `approvalService`, aggregator output is unchanged.

Pass a `failureHandler` to observe batch failures. Defaults to `console.warn`; pass `{ handle: () => {} }` to silence, or your own implementation to route failures into telemetry.

### Provider coverage

The approval service can only enrich a quote whose provider declares its allowance requirements in `order.checks.allowances`. Coverage across shipped providers:

-   **Across, LiFi Intents, OIF `oif-user-open-v0`** — always populated for ERC-20 inputs.
-   **Relay, Bungee** — populated whenever the API flags an approve as needed (including the one-time Permit2 approval for Bungee's gasless path). Omitted when the API considers no approve required.
-   **OIF `oif-escrow-v0`** (Permit2-based gasless) — **not populated**. The OIF wire format does not surface Permit2 approval state, so the adapter has no entry to forward. If your configuration accepts these quotes, the user's first transfer against a given token will fail when the solver cannot pull funds. Handle the one-time `approve(PERMIT2, ...)` yourself, or restrict the provider to `submissionModes: ["user-transaction"]` until the OIF adapter is updated.
-   **OIF `oif-3009-v0`, `oif-resource-lock-v0`** — not populated, and correctly so: EIP-3009 and resource-lock flows don't use ERC-20 `approve`.

For the full API reference see [Approval Service](./api.md#approval-service).

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

## Exact-input vs. exact-output swaps

`QuoteRequest.swapType` decides which side of the transfer is fixed:

-   **`"exact-input"`** (default): you fix `input.amount`. The provider quotes the output amount the user will receive after fees and slippage. Right when the user starts from a known balance — "send 100 USDC across, whatever lands is fine as long as it clears slippage".
-   **`"exact-output"`**: you fix `output.amount`. The provider quotes the input amount the user must supply. Right when the destination amount is what matters — paying an invoice, topping up to an exact balance, funding a contract that expects a specific amount.

Exact-output example:

```typescript
// Deliver exactly 50 USDC on Base. The provider tells us how much USDC
// we need to send from Optimism to cover fees and slippage.
const response = await aggregator.getQuotes({
    user: "0xYourAddress",
    input: {
        chainId: 10, // Optimism
        assetAddress: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", // USDC
        // no `amount` — provider fills this in
    },
    output: {
        chainId: 8453, // Base
        assetAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC
        recipient: "0xRecipient",
        amount: "50000000", // 50 USDC (6 decimals)
    },
    swapType: "exact-output",
});

const quote = response.quotes[0];
// Read the quoted input back from the preview
console.log(`Needs ${quote.preview.inputs[0].amount} input wei`);
```

Provider coverage:

-   **Across, Relay, OIF** — support both modes.
-   **Bungee, LiFi Intents** — `exact-input` only. Requesting `exact-output` from these providers surfaces an error in `response.errors` (the original message is preserved via `errorMsg`); the rest of the aggregator's providers continue normally.

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
2. Quotes are sorted by best output amount by default
3. Use `OrderTracker` to monitor cross-chain transfers
4. Handle errors appropriately using the provided error types
5. Set appropriate timeouts for quote requests
6. Test your implementation on testnet before moving to production
7. Provide custom RPC URLs for better reliability

## Next steps

-   [API Reference](./api.md) — complete function signatures and types
-   [Concepts](./concepts.md) — understand the architecture and provider trade-offs
-   [Order Tracking](./intent-tracking.md) — detailed tracking patterns and provider notes
