---
title: Relay Provider
---

The Relay Protocol provider enables cross-chain token transfers using the Relay bridge infrastructure.

**Status**: Active (mainnet + testnet)

## Configuration

| Field             | Type     | Required | Description                                                                                                                                                         |
| ----------------- | -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `baseUrl`         | string   | No       | Custom API base URL (overrides isTestnet)                                                                                                                           |
| `isTestnet`       | boolean  | No       | Use testnet API (default: false)                                                                                                                                    |
| `providerId`      | string   | No       | Custom provider identifier (default: "relay")                                                                                                                       |
| `apiKey`          | string   | No       | Relay API key for authentication                                                                                                                                    |
| `submissionModes` | string[] | No       | Execution modes: `["user-transaction"]`, `["gasless"]`, or both (default: `["user-transaction"]`). Controls whether quotes request permit-based (gasless) execution |

Notes:

-   `baseUrl` overrides the URL derived from `isTestnet`.
-   When `apiKey` is provided, it is sent as the `x-api-key` header on all requests.
-   When `submissionModes` includes `"gasless"`, the API requests permit-based execution. Tokens that support EIP-3009 (e.g. USDC) are fully gasless — the quote returns only a signature step. Other ERC-20 tokens still require a one-time approval transaction alongside the signature step. See [Relay docs](https://docs.relay.link/features/gasless-swaps) for details.

## Creating the Provider

```typescript
import { createCrossChainProvider } from "@wonderland/interop-cross-chain";

// Relay config is optional - defaults to mainnet
// Mainnet: https://api.relay.link
// Testnet: https://api.testnets.relay.link
const relayProvider = createCrossChainProvider("relay", { isTestnet: true });

// With API key
const relayWithKey = createCrossChainProvider("relay", {
    apiKey: "your-api-key",
});
```

## Getting Quotes

By default, the provider fetches quotes for the `"user-transaction"` mode only. To enable gasless execution, configure `submissionModes` to include `"gasless"` — e.g. `["user-transaction", "gasless"]`. When multiple modes are configured, quotes are fetched in parallel and if a mode is not available for the requested route, only the successful mode's quote is returned.

```typescript
const quotes = await relayProvider.getQuotes({
    user: "0xYourAddress",
    input: {
        chainId: 11155111,
        assetAddress: "0xInputTokenAddress",
        amount: "1000000000000000000", // 1 token (in wei)
    },
    output: {
        chainId: 84532,
        assetAddress: "0xOutputTokenAddress",
        recipient: "0xRecipientAddress",
    },
    swapType: "exact-input",
});

const quote = quotes[0]; // Select the first quote
```

## Fees

After getting a quote, you can inspect the standardized fee breakdown via `quote.fees`:

```typescript
const quote = quotes[0];

console.log(quote.fees?.bridgeFee); // { amount, amountUsd, token }
console.log(quote.fees?.bridgeFeePct); // percentage (wei-encoded, 1e18 = 100%)
console.log(quote.fees?.originGas); // origin chain gas estimate
```

See the [API reference](./api.md#quotefees) for the full `QuoteFees` type.

## Executing Transactions

Relay quotes always contain transaction steps. After getting a quote, execute the transaction:

```typescript
import { getTransactionSteps } from "@wonderland/interop-cross-chain";

const step = getTransactionSteps(quote.order)[0];
const hash = await walletClient.sendTransaction({
    to: step.transaction.to,
    data: step.transaction.data,
    value: step.transaction.value ? BigInt(step.transaction.value) : undefined,
    gas: step.transaction.gas ? BigInt(step.transaction.gas) : undefined,
});
console.log("Transaction sent:", hash);
```

## Permit Flow (Gasless)

When `submissionModes` includes `"gasless"`, the quote requests permit-based execution. Tokens supporting EIP-3009 (e.g. USDC) return only a signature step (fully gasless). Other ERC-20 tokens may still require a one-time approval transaction alongside the signature step. The user signs the EIP-712 typed data payload and submits it to Relay via `submitOrder`:

:::note
Only EIP-712 signature steps (Permit2, EIP-3009) are currently supported. If the Relay API returns an EIP-191 signature step, a `ProviderGetQuoteFailure` is thrown.
:::

```typescript
import { createCrossChainProvider, getSignatureSteps } from "@wonderland/interop-cross-chain";

const relayProvider = createCrossChainProvider("relay", { submissionModes: ["gasless"] });

const quotes = await relayProvider.getQuotes({
    user: "0xYourAddress",
    input: { chainId: 1, assetAddress: "0xUSDC", amount: "1000000" },
    output: { chainId: 10, assetAddress: "0xUSDC" },
});

const quote = quotes[0];

// The quote contains EIP-712 signature steps
const step = getSignatureSteps(quote.order)[0];
const { domain, types, primaryType, message } = step.signaturePayload;
const signature = await walletClient.signTypedData({ domain, types, primaryType, message });

// Submit the signed permit
const result = await relayProvider.submitOrder(quote, signature);
console.log("Order ID:", result.orderId);
```

## Tracking

Relay tracking is fully API-based — it does not require RPC URLs. The SDK polls the Relay API (`/intents/status/v3`) at 5-second intervals until the order is finalized or fails.

To start tracking, you need two values:

-   **`orderId`** — found at `quote.tracking.orderId`. This is the identifier Relay uses to look up the order status.
-   **`openTxHash`** — the bridge transaction hash from the [execution step](#executing-transactions) (not the approval hash).

```typescript
const orderId = quote.tracking?.orderId;
const tracker = executor.prepareTracking("relay");

for await (const item of tracker.watchOrder({
    orderId,
    openTxHash: hash, // from the execution step above
    originChainId: 11155111,
    destinationChainId: 84532,
})) {
    // Handle tracking updates
}
```

## Transaction Notification

Transaction notification is automatic — when tracking starts, the pre-tracker calls Relay's [transaction indexing](https://docs.relay.link/references/api/api_guides/transaction-indexing) via `POST /transactions/index`, accelerating the indexing process before transaction validation completes. No manual step is required.

## Next Step

See a complete working example: [Execute Intent](./example.md)

## References

-   [Relay Protocol Documentation](https://docs.relay.link/)
-   [API Reference](./api.md) — full type definitions for quotes, fees, and orders
-   [Concepts](./concepts.md) — how intent-based transfers work
