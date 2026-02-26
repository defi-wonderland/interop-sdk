---
title: OIF Provider
---

The [OIF (Open Intents Framework)](https://github.com/BootNodeDev/intents-framework) provider enables direct integration with any OIF-compliant solver. If you have access to a solver's API endpoint, you can integrate cross-chain functionality directly into your application using this provider.

## Configuration

| Field             | Type   | Required | Description                        |
| ----------------- | ------ | -------- | ---------------------------------- |
| `solverId`        | string | Yes      | Solver identifier                  |
| `url`             | string | Yes      | Solver API endpoint URL            |
| `headers`         | object | No       | Custom HTTP headers                |
| `adapterMetadata` | object | No       | Additional metadata for the solver |
| `providerId`      | string | No       | Custom provider identifier         |

## Creating the Provider

```typescript
import { createCrossChainProvider } from "@wonderland/interop-cross-chain";

const oifProvider = createCrossChainProvider("oif", {
    solverId: "my-solver",
    url: "https://oif-api.example.com",
});
```

## Execution Modes

The provider offers intent-based cross-chain operations with two execution modes. Use the `ProviderExecutor` to get quotes with SDK-friendly types:

```typescript
import { createProviderExecutor } from "@wonderland/interop-cross-chain";
import { createWalletClient, http } from "viem";
import { base } from "viem/chains";

const executor = createProviderExecutor({ providers: [oifProvider] });
const walletClient = createWalletClient({ account, chain: base, transport: http() });
```

### Protocol Mode (Gasless)

User signs EIP-712 message, solver executes on their behalf. The quote's order contains a **signature step**:

```typescript
const response = await executor.getQuotes({
    user: { chainId: 8453, address: "0xYourAddress..." },
    intent: {
        inputs: [
            {
                asset: { chainId: 8453, address: "0xInputToken..." },
                amount: "1000000",
            },
        ],
        outputs: [
            {
                asset: { chainId: 1, address: "0xOutputToken..." },
            },
        ],
        swapType: "exact-input",
    },
    supportedLocks: ["oif-escrow"],
});

const quote = response.quotes[0];
const step = quote.order.steps[0]; // SignatureStep

if (step.kind === "signature") {
    const { signatureType, ...typedData } = step.signaturePayload;
    const signature = await walletClient.signTypedData(typedData);
    await executor.submitOrder(quote, signature);
}
```

### User Mode (User Pays Gas)

User executes transaction directly. The quote's order contains a **transaction step**:

```typescript
const response = await executor.getQuotes({
    user: { chainId: 8453, address: "0xYourAddress..." },
    intent: {
        inputs: [
            {
                asset: { chainId: 8453, address: "0xInputToken..." },
                amount: "1000000",
            },
        ],
        outputs: [
            {
                asset: { chainId: 1, address: "0xOutputToken..." },
            },
        ],
        swapType: "exact-input",
    },
    // No supportedLocks filter — user-open orders are always included
});

const quote = response.quotes[0];
const step = quote.order.steps[0]; // TransactionStep

if (step.kind === "transaction") {
    await walletClient.sendTransaction({
        to: step.transaction.to,
        data: step.transaction.data,
        ...(step.transaction.value && { value: BigInt(step.transaction.value) }),
    });
}
```

## Approvals

Access approval information from the step-based order:

```typescript
// Protocol mode — check the lock mechanism for escrow orders
if (quote.order.lock?.type === "oif-escrow") {
    // Permit2 approval needed for escrow lock
}

// User mode — check pre-conditions
if (quote.order.checks?.allowances) {
    const { token, spender, required } = quote.order.checks.allowances[0];
    // token is an InteropAccountId: { chainId, address }
}
```

## Lock Mechanisms

-   `oif-escrow` — Gasless execution via solver (Permit2-based escrow + EIP-3009 authorization)
-   `compact-resource-lock` — Compact resource locking
-   No lock — User-open orders (user submits tx directly, always available)

## Payload Validation

The provider validates that order payloads from solvers match the user's intent:

| Order Type             | Validation                                |
| ---------------------- | ----------------------------------------- |
| `oif-escrow-v0`        | token, amount, deadline                   |
| `oif-resource-lock-v0` | token, amount, sponsor, expiration        |
| `oif-3009-v0`          | from, value, token address, expiration    |
| `oif-user-open-v0`     | allowances (token, user, spender, amount) |

## Next Step

See a complete working example: [Execute Intent](./example.md)

## References

-   [Open Intents Framework](https://github.com/openintentsframework)
-   [EIP-7683: Cross Chain Intents](https://www.erc7683.org/)
