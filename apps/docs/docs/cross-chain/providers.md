---
title: Supported Providers
---

This document lists all cross-chain providers supported by the Interop SDK.

## Available Providers

| Provider                                | Status | Description                                     |
| --------------------------------------- | ------ | ----------------------------------------------- |
| [Across Protocol](./across-provider.md) | Active | Cross-chain token transfers using Across bridge |
| [Relay Protocol](./relay-provider.md)   | Active | Cross-chain token transfers using Relay bridge  |
| [OIF](./oif-provider.md)                | Active | Direct integration with OIF-compliant solvers   |
| LiFi Intents                            | Active | Cross-chain via LiFi intent solver              |

## Provider Configuration

```typescript
import { createCrossChainProvider } from "@wonderland/interop-cross-chain";

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
```

| Provider       | Required Config   | Optional Config       |
| -------------- | ----------------- | --------------------- |
| `across`       | (none)            | `isTestnet`           |
| `relay`        | (none)            | `apiKey`, `isTestnet` |
| `oif`          | `solverId`, `url` | —                     |
| `lifi-intents` | `orderServerUrl`  | —                     |

## Order Tracking Requirements

Different providers use different tracking mechanisms. Some need RPC URLs, others are fully API-based:

| Provider         | Opened Intent Parser | Fill Watcher | RPC URLs Needed?            |
| ---------------- | -------------------- | ------------ | --------------------------- |
| Across (mainnet) | OIF event-based      | API-based    | Origin chain only           |
| Across (testnet) | OIF event-based      | Event-based  | Origin + destination chains |
| Relay            | API-based            | API-based    | None                        |
| OIF              | OIF event-based      | Event-based  | Origin + destination chains |

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

## References

-   [API Reference](./api.md)
-   [Getting Started](./getting-started.md) — tutorial for your first cross-chain transfer
-   [Concepts](./concepts.md) — how providers fit into the intent architecture
-   [Advanced Usage](./advanced-usage.md) — aggregation, sorting, and error handling
