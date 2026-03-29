---
title: Bungee Provider
---

The Bungee Protocol provider enables cross-chain token transfers using the Bungee bridge infrastructure, supporting both gasless permit2 flows (ERC20) and onchain transactions (native ETH or via BungeeInbox).

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

| Field             | Type            | Required | Description                                                                               |
| ----------------- | --------------- | -------- | ----------------------------------------------------------------------------------------- |
| `tier`            | `BungeeApiTier` | No       | API tier: `"sandbox"`, `"dedicated"`, or `"frontend"` (default: `"sandbox"`)              |
| `baseUrl`         | string          | No       | Custom API base URL. Overrides the URL derived from `tier`                                |
| `providerId`      | string          | No       | Custom provider identifier (default: `"bungee"`)                                          |
| `apiKey`          | string          | No       | API key for dedicated backend (sent via `x-api-key` header)                               |
| `affiliateId`     | string          | No       | Affiliate ID for tracking (sent via `affiliate` header)                                   |
| `feeBps`          | string          | No       | Convenience fee in basis points (e.g. `"50"` for 0.5%)                                    |
| `feeTakerAddress` | string          | No       | Address to receive the convenience fee. Required when `feeBps` is set                     |
| `submissionModes` | string[]        | No       | Transaction submission modes: `"user-transaction"` (onchain) and/or `"gasless"` (permit2) |
| `slippage`        | string          | No       | Default slippage tolerance (e.g. `"0.5"` for 0.5%)                                        |
| `refuel`          | boolean         | No       | Enable native gas refueling on the destination chain                                      |

Notes:

-   `baseUrl` overrides the URL derived from `tier`.
-   `feeBps` and `feeTakerAddress` must be set together. The fee is deducted from the output amount.
-   `submissionModes` controls how transactions are submitted. `"user-transaction"` forces the onchain BungeeInbox flow (user pays gas), `"gasless"` uses the permit2 signature flow (default). When both modes are specified, quotes are fetched for each mode in parallel and combined.
-   `slippage` sets the default tolerance for all quotes. If not set, Bungee uses its own default.
-   `refuel` tops up native gas on the destination chain so the user can transact immediately after bridging.

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

// Custom base URL — overrides the tier URL
const bungeeProvider = createCrossChainProvider("bungee", {
    baseUrl: "https://my-proxy.example.com",
});
```

## Getting Quotes

### Default (Permit2)

ERC20 transfers use the permit2 signature flow by default. The quote returns a signature step:

```typescript
const quotes = await bungeeProvider.getQuotes({
    user: "0xYourAddress",
    input: {
        chainId: 10, // Optimism
        assetAddress: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", // USDC
        amount: "1000000", // 1 USDC
    },
    output: {
        chainId: 8453, // Base
        assetAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC
    },
});

const quote = quotes[0];
```

### With `submissionModes` (Onchain)

Force the onchain transaction flow instead of permit2. The quote returns a transaction step:

```typescript
const bungeeProvider = createCrossChainProvider("bungee", {
    submissionModes: ["user-transaction"],
});

const quotes = await bungeeProvider.getQuotes({
    user: "0xYourAddress",
    input: {
        chainId: 8453, // Base
        assetAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC
        amount: "1000000",
    },
    output: {
        chainId: 10, // Optimism
        assetAddress: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", // USDC
    },
});

const quote = quotes[0];
```

### With Convenience Fee

Charge an affiliate fee deducted from the output amount:

```typescript
const bungeeProvider = createCrossChainProvider("bungee", {
    feeBps: "50", // 0.5%
    feeTakerAddress: "0xYourFeeReceiverAddress",
});

const quotes = await bungeeProvider.getQuotes({
    user: "0xYourAddress",
    input: {
        chainId: 10,
        assetAddress: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
        amount: "1000000",
    },
    output: {
        chainId: 8453,
        assetAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    },
});

const quote = quotes[0];
// quote.metadata.bungeeAutoRoute.affiliateFee contains the fee details
```

### With Slippage

Set a custom slippage tolerance for quotes:

```typescript
const bungeeProvider = createCrossChainProvider("bungee", {
    slippage: "0.5", // 0.5% tolerance
});
```

### With Refuel

Enable native gas refueling so the user receives a small amount of native token on the destination chain:

```typescript
const bungeeProvider = createCrossChainProvider("bungee", {
    refuel: true,
});
```

### With Custom Base URL

Override the tier URL with a custom endpoint:

```typescript
const bungeeProvider = createCrossChainProvider("bungee", {
    tier: BungeeApiTier.Dedicated,
    baseUrl: "https://public-backend.bungee.exchange", // overrides dedicated URL
});
```

## Fees

After getting a quote, you can inspect the standardized fee breakdown via `quote.fees`:

```typescript
const quote = quotes[0];

console.log(quote.fees?.originGas); // origin chain gas estimate
```

See the [API reference](./api.md#quotefees) for the full `QuoteFees` type.

## Executing Transactions

Bungee quotes can return either a **signature step** (permit2/gasless, default for ERC20) or a **transaction step** (native ETH or `submissionModes: ["user-transaction"]`). Use `getSignatureSteps` and `getTransactionSteps` to handle both:

```typescript
import { getSignatureSteps, getTransactionSteps } from "@wonderland/interop-cross-chain";

const sigSteps = getSignatureSteps(quote.order);
const txSteps = getTransactionSteps(quote.order);

if (sigSteps.length > 0) {
    // Permit2 flow: sign + submit
    const step = sigSteps[0];
    const { signatureType, ...typedData } = step.signaturePayload;
    const signature = await walletClient.signTypedData(typedData);
    await bungeeProvider.submitOrder(quote, signature);
} else if (txSteps.length > 0) {
    // Onchain flow: send transaction directly
    const step = txSteps[0];
    await walletClient.sendTransaction({
        to: step.transaction.to,
        data: step.transaction.data,
        value: step.transaction.value ? BigInt(step.transaction.value) : undefined,
    });
}
```

## Approvals

Access approval information from the order checks:

```typescript
const allowances = quote.order.checks?.allowances ?? [];
for (const { spender, tokenAddress, required } of allowances) {
    // Approve token spend if needed
}
```

## Tracking

Bungee uses API-based tracking. The SDK polls the status endpoint at a 5-second interval:

```
GET /api/v1/bungee/status?requestHash=<orderId>
```

No extra RPC URLs are needed — tracking is handled entirely through the Bungee API.

## Next Step

See a complete working example: [Execute Intent](./example.md)

## References

-   [Bungee Protocol Documentation](https://docs.bungee.exchange)
-   [Bungee API Access](https://docs.bungee.exchange/integrate/get-api-access) — request production API keys
-   [API Reference](./api.md) — full type definitions for quotes, fees, and orders
-   [Concepts](./concepts.md) — how intent-based transfers work
