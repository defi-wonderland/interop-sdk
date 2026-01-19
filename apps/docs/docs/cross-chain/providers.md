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
import { GetQuoteRequest, PostOrderResponse } from "@openintentsframework/oif-specs";
import {
    CrossChainProvider,
    ExecutableQuote,
    FillWatcherConfig,
    OpenedIntentParserConfig,
    ProviderExecuteNotImplemented,
} from "@wonderland/interop-cross-chain";
import { Hex } from "viem";

class MyCustomProvider extends CrossChainProvider {
    readonly protocolName = "my-protocol";
    readonly providerId = "my-protocol-1";

    async getQuotes(params: GetQuoteRequest): Promise<ExecutableQuote[]> {
        // Implement quote fetching logic
        // Return array of ExecutableQuote with preparedTransaction
    }

    async submitSignedOrder(
        quote: ExecutableQuote,
        signature: Hex | Uint8Array,
    ): Promise<PostOrderResponse> {
        // Implement signed order submission for gasless execution
        // Throw if not supported:
        throw new ProviderExecuteNotImplemented("submitSignedOrder not supported");
    }

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
