---
title: Relay Provider
---

The Relay Protocol provider enables cross-chain token transfers using the Relay bridge infrastructure.

**Status**: Active (mainnet + testnet)

## Configuration

| Field        | Type    | Required | Description                                   |
| ------------ | ------- | -------- | --------------------------------------------- |
| `baseUrl`    | string  | No       | Custom API base URL (overrides isTestnet)     |
| `isTestnet`  | boolean | No       | Use testnet API (default: false)              |
| `providerId` | string  | No       | Custom provider identifier (default: "relay") |
| `apiKey`     | string  | No       | Relay API key for authentication              |

Notes:

-   `baseUrl` overrides the URL derived from `isTestnet`.
-   When `apiKey` is provided, it is sent as the `x-api-key` header on all requests.

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

## Executing Transactions

Relay quotes can include **more than one transaction step**. A common case is when the user needs to approve a token before bridging — Relay returns both steps together: first the approval, then the deposit.

Because of this, you should always loop through all steps returned by `getTransactionSteps()` instead of executing only the first one.

There are two important rules when handling multiple steps:

1. **Don't send ETH value on approval steps** — approvals only set a token allowance, they don't transfer ETH. You can tell a step is an approval if its `data` starts with `0x095ea7b3` (the standard ERC-20 `approve` function selector).
2. **Save the bridge transaction hash** — only the hash from the non-approval step should be used for [tracking](#tracking). Ignore approval hashes for this purpose.

```typescript
import type { Address, Hex } from "viem";
import { getTransactionSteps } from "@wonderland/interop-cross-chain";
import { createPublicClient, createWalletClient, http } from "viem";
import { sepolia } from "viem/chains";

const walletClient = createWalletClient({
    chain: sepolia,
    transport: http(),
    account: yourAccount,
});

const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(),
});

// Get all transaction steps from the quote
const txSteps = getTransactionSteps(quote.order);
let bridgeTxHash: Hex | undefined;

for (const txStep of txSteps) {
    const { to, data, value, gas } = txStep.transaction;

    // Check if this step is a token approval
    const isApproval = data.startsWith("0x095ea7b3");
    const parsedGas = gas ? BigInt(gas) : 0n;

    const hash = await walletClient.sendTransaction({
        to: to as Address,
        data: data as Hex,
        // Only send ETH value on bridge steps, never on approvals
        value: !isApproval && value ? BigInt(value) : undefined,
        gas: parsedGas > 0n ? parsedGas : undefined,
    });

    await publicClient.waitForTransactionReceipt({ hash });

    // Keep track of the bridge hash for order tracking later
    if (!isApproval) {
        bridgeTxHash = hash;
    }
}
```

:::tip Allowance pre-checks
Some quotes don't embed an approval step but instead list the required allowances in `quote.order.checks.allowances`. When that happens, you should check and approve token allowances yourself before executing the transaction steps. See the [full example](./example.md) for a complete implementation.
:::

## Features

-   Cross-chain token transfers
-   Quote fetching with fee calculation
-   Transaction simulation
-   Order tracking support
-   API-based intent tracking
-   Automatic transaction notification for faster solver indexing via the pre-tracker

## Tracking

Relay tracking is fully API-based — it does not require RPC URLs. The SDK polls the Relay API (`/intents/status/v3`) at 5-second intervals until the order is finalized or fails.

To start tracking, you need two values:

-   **`orderId`** — found at `quote.order.metadata.relayRequestId`. This is the identifier Relay uses to look up the order status.
-   **`openTxHash`** — the bridge transaction hash from the [execution step](#executing-transactions) (not the approval hash).

```typescript
const orderId = quote.order.metadata?.relayRequestId as string;
const tracker = executor.prepareTracking("relay");

for await (const item of tracker.watchOrder({
    orderId,
    openTxHash: bridgeTxHash,
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
