---
title: Supported Providers
---

This document lists all cross-chain providers supported by the Interop SDK.

## Available Providers

| Provider                                | Status  | Description                                     |
| --------------------------------------- | ------- | ----------------------------------------------- |
| [Across Protocol](./across-provider.md) | Testnet | Cross-chain token transfers using Across bridge |
| [OIF](./oif-provider.md)                | Active  | Direct integration with OIF-compliant solvers   |

> Additional protocols are planned for future releases.

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
        // params.user is a plain EVM address string
        // params.input / params.output are at the top level (no intent wrapper)
        // Return SDK-friendly Quote[] with step-based orders
        return [
            {
                order: {
                    steps: [
                        {
                            kind: "transaction",
                            chainId: params.input.asset.chainId,
                            transaction: { to: "0x...", data: "0x..." },
                        },
                    ],
                },
                preview: {
                    inputs: [
                        {
                            account: { chainId: params.input.asset.chainId, address: params.user },
                            asset: params.input.asset,
                            amount: "1000000",
                        },
                    ],
                    outputs: [
                        {
                            account: { chainId: params.output.asset.chainId, address: params.user },
                            asset: params.output.asset,
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
-   [Aggregator](./advanced-usage.md#aggregator)
