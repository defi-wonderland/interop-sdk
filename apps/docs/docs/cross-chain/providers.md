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

You can create custom providers by implementing the `CrossChainProvider` interface:

```typescript
import {
    CrossChainProvider,
    GetQuoteParams,
    GetQuoteResponse,
} from "@wonderland/interop-cross-chain";

class MyCustomProvider extends CrossChainProvider<MyOpenParams> {
    readonly protocolName = "my-protocol";

    async getQuote<Action extends MyOpenParams["action"]>(
        action: Action,
        params: GetQuoteParams<Action>,
    ): Promise<GetQuoteResponse<Action, MyOpenParams>> {
        // Implement quote fetching logic
    }

    validateOpenParams(params: MyOpenParams): void {
        // Implement validation logic
    }

    async validatedSimulateOpen(params: MyOpenParams): Promise<TransactionRequest[]> {
        // Implement transaction simulation
    }
}
```

See the [API Reference](./api.md) for more details on implementing custom providers.

## References

-   [API Reference](./api.md)
-   [Getting Started](./getting-started.md)
-   [Provider Executor](./advanced-usage.md#provider-executor)
