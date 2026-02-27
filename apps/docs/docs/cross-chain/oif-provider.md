---
title: OIF Provider
---

The [OIF (Open Intents Framework)](https://github.com/BootNodeDev/intents-framework) provider enables direct integration with any OIF-compliant solver. If you have access to a solver's API endpoint, you can integrate cross-chain functionality directly into your application using this provider.

## Configuration

| Field             | Type     | Required | Description                                                                                                |
| ----------------- | -------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| `solverId`        | string   | Yes      | Solver identifier                                                                                          |
| `url`             | string   | Yes      | Solver API endpoint URL                                                                                    |
| `headers`         | object   | No       | Custom HTTP headers                                                                                        |
| `adapterMetadata` | object   | No       | Additional metadata for the solver                                                                         |
| `providerId`      | string   | No       | Custom provider identifier                                                                                 |
| `supportedLocks`  | string[] | No       | Lock mechanisms to request (e.g. `["oif-escrow"]`, `["compact-resource-lock"]`). Default: `["oif-escrow"]` |
| `submissionModes` | string[] | No       | Execution modes: `["user-transaction"]`, `["gasless"]`, or both (default). Controls order types            |

### Lock Mechanism Mapping

The `supportedLocks` option controls which OIF order types the solver returns:

| Lock Mechanism          | OIF Order Types                |
| ----------------------- | ------------------------------ |
| `oif-escrow`            | `oif-escrow-v0`, `oif-3009-v0` |
| `compact-resource-lock` | `oif-resource-lock-v0`         |

`oif-user-open-v0` (user-pays-gas) is controlled by `submissionModes` independently.

## Creating the Provider

```typescript
import { createCrossChainProvider } from "@wonderland/interop-cross-chain";

// Default: oif-escrow lock type, all submission modes
const oifProvider = createCrossChainProvider("oif", {
    solverId: "my-solver",
    url: "https://oif-api.example.com",
});

// Gasless only (escrow-based)
const gaslessProvider = createCrossChainProvider("oif", {
    solverId: "my-solver",
    url: "https://oif-api.example.com",
    supportedLocks: ["oif-escrow"],
    submissionModes: ["gasless"],
});

// User-pays-gas only
const userTxProvider = createCrossChainProvider("oif", {
    solverId: "my-solver",
    url: "https://oif-api.example.com",
    submissionModes: ["user-transaction"],
});
```

## Execution Modes

The provider offers intent-based cross-chain operations with two execution modes:

### Protocol Mode (Gasless)

User signs EIP-712 message, solver executes on their behalf:

```typescript
import { createCrossChainProvider, getSignatureSteps } from "@wonderland/interop-cross-chain";
import { createWalletClient, http } from "viem";
import { base } from "viem/chains";

const quotes = await oifProvider.getQuotes({
    user: "0xYourAddress",
    input: {
        chainId: 1,
        assetAddress: "0xInputTokenAddress",
        amount: "1000000",
    },
    output: {
        chainId: 42161,
        assetAddress: "0xOutputTokenAddress",
    },
    swapType: "exact-input",
});

const quote = quotes[0];
const walletClient = createWalletClient({ account, chain: base, transport: http() });
const step = getSignatureSteps(quote.order)[0];
const { signatureType, ...typedData } = step.signaturePayload;
const signature = await walletClient.signTypedData(typedData);
await oifProvider.submitOrder(quote, signature);
```

### User Mode (User Pays Gas)

User executes transaction directly:

```typescript
import { getTransactionSteps } from "@wonderland/interop-cross-chain";

const quotes = await oifProvider.getQuotes({
    user: "0xYourAddress",
    input: {
        chainId: 1,
        assetAddress: "0xInputTokenAddress",
        amount: "1000000",
    },
    output: {
        chainId: 42161,
        assetAddress: "0xOutputTokenAddress",
    },
    swapType: "exact-input",
});

const quote = quotes[0];
const step = getTransactionSteps(quote.order)[0];
await walletClient.sendTransaction({
    to: step.transaction.to,
    data: step.transaction.data,
    value: step.transaction.value ? BigInt(step.transaction.value) : undefined,
});
```

## Approvals

Access approval information from the order checks:

```typescript
// Allowance requirements from order checks
const allowances = quote.order.checks?.allowances ?? [];
for (const { spender, tokenAddress, required } of allowances) {
    // Approve token spend if needed
}
```

## Supported Order Types

-   `oif-escrow-v0` - Permit2-based escrow (gasless)
-   `oif-3009-v0` - EIP-3009 transfer with authorization (gasless)
-   `oif-resource-lock-v0` - Compact resource locking (gasless)
-   `oif-user-open-v0` - User executes transaction directly

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
