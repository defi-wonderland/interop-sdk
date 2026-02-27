---
title: Supported Providers
---

This document lists all cross-chain providers supported by the Interop SDK.

## Available Providers

| Provider                                | Status  | Description                                     |
| --------------------------------------- | ------- | ----------------------------------------------- |
| [Across Protocol](./across-provider.md) | Testnet | Cross-chain token transfers using Across bridge |
| [Relay](./relay-provider.md)            | POC     | Cross-chain transfers and swaps using Relay     |
| [OIF](./oif-provider.md)                | Active  | Direct integration with OIF-compliant solvers   |

## Creating Custom Providers

You can create custom providers by extending the `CrossChainProvider` abstract class:

```typescript
import type {
    FillWatcherConfig,
    OpenedIntentParserConfig,
    Quote,
    QuoteRequest,
} from "@wonderland/interop-cross-chain";
import { CrossChainProvider } from "@wonderland/interop-cross-chain";

class MyCustomProvider extends CrossChainProvider {
    readonly protocolName = "my-protocol";
    readonly providerId = "my-protocol-1";

    async getQuotes(params: QuoteRequest): Promise<Quote[]> {
        // params.user is { chainId, address } — no ERC-7930 hex
        // Return SDK-friendly Quote[] with step-based orders
        return [
            {
                order: {
                    steps: [
                        {
                            kind: "transaction",
                            chainId: params.user.chainId,
                            transaction: { to: "0x...", data: "0x..." },
                        },
                    ],
                },
                preview: {
                    inputs: [
                        {
                            account: params.user,
                            asset: params.intent.inputs[0].asset,
                            amount: "1000000",
                        },
                    ],
                    outputs: [
                        {
                            account: params.user,
                            asset: params.intent.outputs[0].asset,
                            amount: "990000",
                        },
                    ],
                },
                provider: this.providerId,
            },
        ];
    }

    // submitOrder() is optional — default throws ProviderExecuteNotImplemented.
    // Override only if your provider supports solver-based submission (gasless).

    getTrackingConfig(): {
        openedIntentParserConfig: OpenedIntentParserConfig;
        fillWatcherConfig: FillWatcherConfig;
    } {
        // Return protocol-specific tracking configuration
    }
}
```

See the [API Reference](./api.md) for more details on the provider interface.

## References

-   [API Reference](./api.md)
-   [Getting Started](./getting-started.md)
-   [Provider Executor](./advanced-usage.md#provider-executor)
