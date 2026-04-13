---
title: Supported Providers
---

This document lists all cross-chain providers supported by the Interop SDK.

## Available Providers

| Provider                                | Status | Description                                               |
| --------------------------------------- | ------ | --------------------------------------------------------- |
| [Across Protocol](./across-provider.md) | Active | Cross-chain token transfers using Across bridge           |
| [Relay Protocol](./relay-provider.md)   | Active | Cross-chain token transfers using Relay bridge            |
| [OIF](./oif-provider.md)                | Active | Direct integration with OIF-compliant solvers             |
| [Bungee Protocol](./bungee-provider.md) | Active | Cross-chain transfers via onchain or gasless permit2 flow |
| LiFi Intents                            | Active | Cross-chain via LiFi intent solver                        |

## Provider Configuration

```typescript
import { BungeeApiTier, createCrossChainProvider } from "@wonderland/interop-cross-chain";

// Across — no required config
createCrossChainProvider("across");
createCrossChainProvider("across", { isTestnet: true });

// Relay — no required config
createCrossChainProvider("relay");
createCrossChainProvider("relay", { apiKey: "...", isTestnet: true });

// OIF — solverId and url are required
createCrossChainProvider("oif", { solverId: "my-solver", url: "https://solver.example.com" });

// LiFi Intents — orderServerUrl is required
createCrossChainProvider("lifi-intents", { orderServerUrl: "https://..." });

// Bungee — no required config
createCrossChainProvider("bungee");
createCrossChainProvider("bungee", {
    tier: BungeeApiTier.Dedicated,
    apiKey: "...",
    affiliateId: "...",
});
```

| Provider       | Required Config   | Optional Config                                                                                       |
| -------------- | ----------------- | ----------------------------------------------------------------------------------------------------- |
| `across`       | (none)            | `isTestnet`                                                                                           |
| `relay`        | (none)            | `apiKey`, `isTestnet`                                                                                 |
| `oif`          | `solverId`, `url` | —                                                                                                     |
| `lifi-intents` | `orderServerUrl`  | —                                                                                                     |
| `bungee`       | (none)            | `tier`, `apiKey`, `affiliateId`, `feeBps`, `feeTakerAddress`, `submissionModes`, `slippage`, `refuel` |

## Order Tracking Requirements

Different providers use different tracking mechanisms. Some need RPC URLs, others are fully API-based:

| Provider         | Opened Intent Parser | Fill Watcher | RPC URLs Needed?            |
| ---------------- | -------------------- | ------------ | --------------------------- |
| Across (mainnet) | OIF event-based      | API-based    | Origin chain only           |
| Across (testnet) | OIF event-based      | Event-based  | Origin + destination chains |
| Relay            | API-based            | API-based    | None                        |
| OIF              | OIF event-based      | Event-based  | Origin + destination chains |
| Bungee           | API-based            | API-based    | None                        |

## Creating Custom Providers

You can create custom providers by extending the `CrossChainProvider` abstract class. Two methods are required (`getQuotes` and `getTrackingConfig`); the rest have default implementations that throw `ProviderExecuteNotImplemented`.

```typescript
import type {
    FillWatcherConfig,
    OpenedIntentParserConfig,
    PreTrackerConfig,
    Quote,
    QuoteRequest,
    SubmitOrderResponse,
} from "@wonderland/interop-cross-chain";
import type { Hex } from "viem";
import { CrossChainProvider } from "@wonderland/interop-cross-chain";

class MyCustomProvider extends CrossChainProvider {
    readonly protocolName = "my-protocol";
    readonly providerId = "my-protocol-1";

    // Required: fetch quotes from your protocol's API
    async getQuotes(params: QuoteRequest): Promise<Quote[]> {
        // Adapt params to your protocol's format, call your API,
        // and return an array of Quote objects
    }

    // Required: configure how the SDK tracks orders for your protocol
    getTrackingConfig(): {
        openedIntentParserConfig: OpenedIntentParserConfig;
        fillWatcherConfig: FillWatcherConfig;
        preTrackerConfig?: PreTrackerConfig;
    } {
        // Return protocol-specific tracking configuration
        // See Relay or Across providers for examples
    }

    // Optional: override to support gasless (signature-based) order submission
    // Default throws ProviderExecuteNotImplemented
    async submitOrder(quote: Quote, signature: Hex): Promise<SubmitOrderResponse> {
        // Submit the signed order to your protocol's API
    }
}
```

See the [API Reference](./api.md) for the full `Quote`, `QuoteRequest`, and tracking config types.

## Supported Chains

The table below shows which chains each provider supports **as of April 2026**. Providers that discover chains dynamically via their API are noted separately — call `discoverAssets()` to get a live list for those providers.

### Across

**Asset discovery** behaves differently between mainnet and testnet:

- **Mainnet**: `discoverAssets()` queries the Across API dynamically — the same as Relay and Bungee. No hardcoded token list is used.
- **Testnet**: `discoverAssets()` uses a static hardcoded token list. The Across API returns mainnet chain IDs even for testnet queries, so a static list is the only reliable option for testnet.

**Getting quotes** (`getQuotes()`) is fully API-driven for both mainnet and testnet — there is no hardcoded chain constraint.

**Building quotes** (`buildQuote()`) requires a SpokePool contract address and a wrapped-native (WETH) address for the origin chain. The SDK has these hardcoded for the chains below. For any other chain, pass `escrowContractAddress` explicitly in the `buildQuote()` params as a fallback.

| Chain | Chain ID | Mainnet | Testnet |
|-------|----------|---------|---------|
| Base | 8453 | ✓ | — |
| Arbitrum One | 42161 | ✓ | — |
| Optimism | 10 | ✓ | — |
| Sepolia | 11155111 | — | ✓ |
| Base Sepolia | 84532 | — | ✓ |
| Arbitrum Sepolia | 421614 | — | ✓ |

### Relay, Bungee, and LI.FI Intents

These providers discover supported chains and tokens dynamically via their respective APIs. There is no hardcoded chain list in the SDK.

Call `discoverAssets()` on the provider to enumerate all chains and tokens currently available:

```typescript
const relayProvider = createCrossChainProvider("relay");
const assets = await relayProvider.discoverAssets();
// assets is an array of { chainId, assets: [...] }
```

### OIF

OIF also supports `discoverAssets()` — the SDK queries the configured solver's API to enumerate the chains and tokens it supports:

```typescript
const oifProvider = createCrossChainProvider("oif", {
  solverId: "my-solver",
  url: "https://oif-api.example.com",
});
const assets = await oifProvider.discoverAssets();
// assets is an array of { chainId, assets: [...] }
```

Supported chains and tokens depend entirely on the solver you configure.

### Full Provider Comparison

| Chain | Chain ID | Across¹ | Relay | OIF | Bungee | LI.FI Intents |
|-------|----------|---------|-------|-----|--------|---------------|
| Ethereum | 1 | via API | ✓ | via solver API | ✓ | ✓ |
| Base | 8453 | via API | ✓ | via solver API | ✓ | ✓ |
| Arbitrum One | 42161 | via API | ✓ | via solver API | ✓ | ✓ |
| Optimism | 10 | via API | ✓ | via solver API | ✓ | ✓ |
| Others | varies | via API | via API | via solver API | via API | via API |

¹ `getQuotes()` and `discoverAssets()` are fully API-driven for Across. `buildQuote()` additionally requires hardcoded SpokePool addresses, which the SDK provides for Base, Arbitrum One, Optimism (mainnet) and Sepolia, Base Sepolia, Arbitrum Sepolia (testnet). Pass `escrowContractAddress` in params for other chains.

:::tip
For all providers, the chain list grows as providers add support. Always call `discoverAssets()` at runtime rather than relying on a static list.
:::

## References

-   [API Reference](./api.md)
-   [Getting Started](./getting-started.md) — tutorial for your first cross-chain transfer
-   [Concepts](./concepts.md) — how providers fit into the intent architecture
-   [Advanced Usage](./advanced-usage.md) — aggregation, sorting, and error handling
