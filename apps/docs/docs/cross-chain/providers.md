---
title: Supported Providers
---

This document lists all cross-chain providers supported by the Interop SDK, their current status, and implementation details.

## Provider Status

#### Across Protocol

**Status**: Testnet

**Protocol Name**: `"across"`

**Features**:
- Cross-chain token transfers
- Quote fetching with fee calculation
- Transaction simulation
- Intent tracking support
- EIP-7683 Open Intent Framework integration

**Usage**:

```typescript
import { createCrossChainProvider } from "@wonderland/interop-cross-chain";

const provider = createCrossChainProvider("across");

const quote = await provider.getQuote("crossChainTransfer", {
    sender: "0x...",
    recipient: "0x...",
    inputTokenAddress: "0x...",
    outputTokenAddress: "0x...",
    inputAmount: "1000000000000000000",
    inputChainId: 11155111,
    outputChainId: 84532,
});
```

**Supported Actions**:
- `crossChainTransfer`

**Documentation**:
- [Across Protocol Documentation](https://docs.across.to/)

---

#### Sample Provider

**Status**: Implemented for testing and development

**Protocol Name**: `"sample-protocol"`

**Features**:
- Basic quote generation (returns input amount as output)
- Transaction simulation (returns empty array)
- Useful for testing SDK integration

**Usage**:

```typescript
import { createCrossChainProvider } from "@wonderland/interop-cross-chain";

const provider = createCrossChainProvider("sample-protocol");

// Returns a quote with inputAmount === outputAmount
const quote = await provider.getQuote("crossChainTransfer", {
    sender: "0x...",
    recipient: "0x...",
    inputTokenAddress: "0x...",
    outputTokenAddress: "0x...",
    inputAmount: "1000000000000000000",
    inputChainId: 11155111,
    outputChainId: 84532,
});
```

**Supported Actions**:
- `crossChainTransfer` 
- `crossChainSwap` 

>This provider is for testing only and should not be used in production.



## Creating Custom Providers

You can create custom providers by implementing the `CrossChainProvider` interface:

```typescript
import { CrossChainProvider, GetQuoteParams, GetQuoteResponse } from "@wonderland/interop-cross-chain";

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

## Getting Provider Information

You can get information about a provider:

```typescript
import { createCrossChainProvider } from "@wonderland/interop-cross-chain";

const provider = createCrossChainProvider("across");

// Get protocol name
const protocolName = provider.getProtocolName(); // "across"
```

## References

-   [API Reference](./api.md)
-   [Getting Started](./getting-started.md)
-   [Provider Executor](./advanced-usage.md#provider-executor)

