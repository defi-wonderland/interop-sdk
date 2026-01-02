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

const oifProvider = createCrossChainProvider(
    "oif",
    {
        solverId: "my-solver",
        url: "https://oif-api.example.com",
    },
    {},
);
```

## Execution Modes

The provider offers intent-based cross-chain operations with two execution modes:

### Protocol Mode (Gasless)

User signs EIP-712 message, solver executes on their behalf:

```typescript
import { createWalletClient, http } from "viem";
import { base } from "viem/chains";

const quotes = await oifProvider.getQuotes({
    user: USER_INTEROP_ADDRESS, // user's interop address (binary format)
    intent: {
        intentType: "oif-swap",
        inputs: [
            {
                user: USER_INTEROP_ADDRESS, // sender's interop address (binary format)
                asset: INPUT_TOKEN_INTEROP_ADDRESS, // input token interop address (binary format)
                amount: "1000000",
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
    supportedTypes: ["oif-escrow-v0"],
});

const quote = quotes[0];
const walletClient = createWalletClient({ account, chain: base, transport: http() });
const { domain, primaryType, message, types } = quote.order.payload;
const signature = await walletClient.signTypedData({ domain, primaryType, message, types });
await oifProvider.submitSignedOrder(quote, signature);
```

### User Mode (User Pays Gas)

User executes transaction directly. The `preparedTransaction` is included automatically in the quote:

```typescript
const quotes = await oifProvider.getQuotes({
    user: USER_INTEROP_ADDRESS, // user's interop address (binary format)
    intent: {
        intentType: "oif-swap",
        inputs: [
            {
                user: USER_INTEROP_ADDRESS, // sender's interop address (binary format)
                asset: INPUT_TOKEN_INTEROP_ADDRESS, // input token interop address (binary format)
                amount: "1000000",
            },
        ],
        outputs: [
            {
                receiver: RECEIVER_INTEROP_ADDRESS, // recipient's interop address (binary format)
                asset: OUTPUT_TOKEN_INTEROP_ADDRESS, // output token interop address (binary format)
            },
        ],
        originSubmission: { mode: "user" },
        swapType: "exact-input",
    },
    supportedTypes: ["oif-user-open-v0"],
});

const quote = quotes[0];
if (quote.preparedTransaction) {
    await walletClient.sendTransaction(quote.preparedTransaction);
}
```

## Approvals

Access approval information from quotes:

```typescript
// Protocol mode (oif-escrow-v0) - typically Permit2
const spender = quote.order.payload.message.spender;

// User mode (oif-user-open-v0)
const { token, user, spender, required } = quote.order.checks.allowances[0];
```

## Supported Order Types

-   `oif-escrow-v0` - Gasless execution via solver
-   `oif-user-open-v0` - User executes transaction directly

## Next Step

See a complete working example: [Execute Intent](./example.md)

## References

-   [Open Intents Framework](https://github.com/openintentsframework)
-   [EIP-7683: Cross Chain Intents](https://www.erc7683.org/)
