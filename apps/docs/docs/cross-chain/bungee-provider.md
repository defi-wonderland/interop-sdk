---
title: Bungee Provider
---

The Bungee Protocol provider enables cross-chain token transfers using the Bungee bridge infrastructure, supporting both gasless permit2 flows (ERC20) and standard transactions (native ETH).

**Status**: Active (mainnet)

## API Access

Bungee offers three integration tiers, each with a different base URL and authentication method:

| Tier              | Endpoint                                     | Authentication        | Rate Limit          | Use Case                  |
| ----------------- | -------------------------------------------- | --------------------- | ------------------- | ------------------------- |
| Public Sandbox    | `https://public-backend.bungee.exchange/`    | None                  | Very Limited        | Testing only              |
| Dedicated Backend | `https://dedicated-backend.bungee.exchange/` | API Key (`x-api-key`) | 20 RPS (extendable) | Production backends       |
| Frontend / Direct | `https://backend.bungee.exchange/`           | Whitelisted Domains   | 100 RPM             | Frontends, dApps, wallets |

-   The **public sandbox** requires no setup and is used by default.
-   For production, [request API access](https://forms.gle/z3q5RdXjouuXR85k9) to get an API key and affiliate ID.
-   The **dedicated backend** is recommended for server-to-server integrations. Keep your API key server-side.
-   The **frontend/direct** tier uses domain whitelisting instead of API keys.

## Configuration

| Field             | Type            | Required | Description                                                                  |
| ----------------- | --------------- | -------- | ---------------------------------------------------------------------------- |
| `tier`            | `BungeeApiTier` | No       | API tier: `"sandbox"`, `"dedicated"`, or `"frontend"` (default: `"sandbox"`) |
| `baseUrl`         | string          | No       | Custom API base URL. Overrides the URL derived from `tier`                   |
| `providerId`      | string          | No       | Custom provider identifier (default: `"bungee"`)                             |
| `apiKey`          | string          | No       | API key for dedicated backend (sent via `x-api-key` header)                  |
| `affiliateId`     | string          | No       | Affiliate ID for tracking (sent via `affiliate` header)                      |
| `feeBps`          | string          | No       | Convenience fee in basis points (e.g. `"50"` for 0.5%)                       |
| `feeTakerAddress` | string          | No       | Address to receive the convenience fee. Required when `feeBps` is set        |
| `useInbox`        | boolean         | No       | Force onchain tx flow (BungeeInbox) instead of permit2 signatures            |

## Creating the Provider

```typescript
import { BungeeApiTier, createCrossChainProvider } from "@wonderland/interop-cross-chain";

// Public sandbox (default) — no authentication needed
const bungeeProvider = createCrossChainProvider("bungee");

// Dedicated backend — with API key and affiliate ID
const bungeeProvider = createCrossChainProvider("bungee", {
    tier: BungeeApiTier.Dedicated,
    apiKey: "your-api-key",
    affiliateId: "your-affiliate-id",
});

// Frontend / direct — domain-whitelisted, no API key
const bungeeProvider = createCrossChainProvider("bungee", {
    tier: BungeeApiTier.Frontend,
});

// Custom base URL — overrides the tier URL
const bungeeProvider = createCrossChainProvider("bungee", {
    baseUrl: "https://my-proxy.example.com",
});
```

## Getting Quotes

```typescript
const quotes = await bungeeProvider.getQuotes({
    user: "0xYourAddress",
    input: {
        chainId: 10, // Optimism
        assetAddress: "0xInputTokenAddress",
        amount: "1000000000000000000", // 1 token (in wei)
    },
    output: {
        chainId: 42161, // Arbitrum
        assetAddress: "0xOutputTokenAddress",
    },
    swapType: "exact-input",
});

const quote = quotes[0]; // Select the first quote
```

## Fees

After getting a quote, you can inspect the standardized fee breakdown via `quote.fees`:

```typescript
const quote = quotes[0];

console.log(quote.fees?.originGas); // origin chain gas estimate
```

See the [API reference](./api.md#quotefees) for the full `QuoteFees` type.

## Executing Transactions

Bungee supports two execution modes depending on the asset type:

### Native ETH (User Mode — Transaction)

For native ETH transfers, the user sends a transaction directly:

```typescript
import { getTransactionSteps } from "@wonderland/interop-cross-chain";
import { createWalletClient, http } from "viem";
import { optimism } from "viem/chains";

const walletClient = createWalletClient({
    chain: optimism,
    transport: http(),
    account: yourAccount,
});

const step = getTransactionSteps(quote.order)[0];
const hash = await walletClient.sendTransaction({
    to: step.transaction.to,
    data: step.transaction.data,
    value: step.transaction.value ? BigInt(step.transaction.value) : undefined,
});
console.log("Transaction sent:", hash);
```

### ERC20 (Protocol Mode — Permit2 Signature)

For ERC20 transfers, the user signs a permit2 message and the protocol submits the order:

```typescript
import { getSignatureSteps } from "@wonderland/interop-cross-chain";
import { createWalletClient, http } from "viem";
import { optimism } from "viem/chains";

const walletClient = createWalletClient({
    chain: optimism,
    transport: http(),
    account: yourAccount,
});

const step = getSignatureSteps(quote.order)[0];
const { signatureType, ...typedData } = step.signaturePayload;
const signature = await walletClient.signTypedData(typedData);
await bungeeProvider.submitOrder(quote, signature);
```

## Tracking

Bungee uses API-based tracking. The SDK polls the status endpoint at a 5-second interval:

```
GET /api/v1/bungee/status?requestHash=<txHashOrOrderId>
```

No extra RPC URLs are needed — tracking is handled entirely through the Bungee API.

## Next Step

See a complete working example: [Execute Intent](./example.md)

## References

-   [Bungee Protocol Documentation](https://docs.bungee.exchange)
-   [Bungee API Access](https://docs.bungee.exchange/integrate/get-api-access) — request production API keys
-   [API Reference](./api.md) — full type definitions for quotes, fees, and orders
-   [Concepts](./concepts.md) — how intent-based transfers work
