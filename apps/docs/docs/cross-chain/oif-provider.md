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
| `submissionModes` | string[] | No       | Execution modes: `["user-transaction"]`, `["gasless"]`, or both. Default: all modes                        |

:::info OIF defaults to all submission modes

Unlike Relay and Bungee, the OIF provider enables **both submission modes** when `submissionModes` is not set — `"user-transaction"` (user pays gas) and `"gasless"` (solver executes on behalf of the user). The exact order types available also depend on `supportedLocks` (default: `["oif-escrow"]`).

`"user-transaction"` maps to `oif-user-open-v0`; `"gasless"` maps to escrow-based order types (`oif-escrow-v0`, `oif-3009-v0`, `oif-resource-lock-v0`).

To restrict to a specific mode, set it explicitly:

```typescript
// User-pays-gas quotes only
submissionModes: ["user-transaction"];

// Gasless quotes only
submissionModes: ["gasless"];
```

:::

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
// walletClient: a viem WalletClient connected to the user's wallet
await walletClient.sendTransaction({
    to: step.transaction.to,
    data: step.transaction.data,
    value: step.transaction.value ? BigInt(step.transaction.value) : undefined,
});
```

## Approvals

`oif-user-open-v0` and `oif-escrow-v0` need an ERC-20 `approve` before the transfer (the latter approves the canonical Permit2 address). `oif-3009-v0` and `oif-resource-lock-v0` do not.

The SDK surfaces what is needed under `quote.order.checks.allowances`. Read it yourself, or pass an `ApprovalService` to the aggregator and the `approve` step is prepended to `order.steps` when the on-chain allowance is short.

For `oif-escrow-v0`, use `InfiniteAmountStrategy`: Permit2 consumes the allowance on every pull, so an exact-amount approval would re-trigger before every order.

```typescript
import {
    createAggregator,
    createApprovalService,
    InfiniteAmountStrategy,
} from "@wonderland/interop-cross-chain";

const aggregator = createAggregator({
    providers: [oifProvider],
    approvalService: createApprovalService({
        rpcUrls: { 8453: "https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY" },
        amountStrategy: new InfiniteAmountStrategy(),
    }),
});
```

See [Automatic ERC-20 Approvals](./advanced-usage.md#automatic-erc-20-approvals) for the full reference.

## Next Step

See a complete working example: [Execute Intent](./example.md)

## References

-   [Open Intents Framework](https://github.com/openintentsframework)
-   [EIP-7683: Cross Chain Intents](https://www.erc7683.org/)
-   [API Reference](./api.md) — full type definitions for quotes, fees, and orders
-   [Concepts](./concepts.md) — how intent-based transfers work
