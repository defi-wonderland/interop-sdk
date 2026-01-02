---
title: API
---

### Cross-chain Providers

A set of classes and utilities for handling cross-chain operations through various protocols.

#### Methods

-   **createCrossChainProvider**(protocolName: string, config: ProviderConfig, dependencies: Dependencies): CrossChainProvider

    Creates a provider instance for a supported cross-chain protocol.

    ```typescript
    import { createCrossChainProvider } from "@wonderland/interop-cross-chain";

    const provider = createCrossChainProvider(
        "across",
        { apiUrl: "https://testnet.across.to/api" },
        {},
    );
    ```

#### CrossChainProvider Class

An abstract class that defines the interface for cross-chain protocol providers.

-   **getProtocolName**(): string

    Returns the name of the protocol this provider implements.

    ```typescript
    const protocolName = provider.getProtocolName(); // e.g., "across"
    ```

-   **getProviderId**(): string

    Returns the unique provider instance ID.

    ```typescript
    const providerId = provider.getProviderId(); // e.g., "across-1"
    ```

-   **getQuotes**(params: GetQuoteRequest): Promise\<ExecutableQuote[]\>

    Fetches quotes for a cross-chain operation.

    ```typescript
    const quotes = await provider.getQuotes({
        user: USER_INTEROP_ADDRESS, // user's interop address (binary format)
        intent: {
            intentType: "oif-swap",
            inputs: [
                {
                    user: USER_INTEROP_ADDRESS, // sender's interop address (binary format)
                    asset: INPUT_TOKEN_INTEROP_ADDRESS, // input token interop address (binary format)
                    amount: "1000000000000000000",
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
        supportedTypes: ["across"],
    });
    ```

-   **submitSignedOrder**(quote: ExecutableQuote, signature: Hex): Promise\<PostOrderResponse\>

    Submits a signed order for gasless execution.

    ```typescript
    const response = await provider.submitSignedOrder(quote, signature);
    ```

-   **getTrackingConfig**(): TrackingConfig

    Returns protocol-specific tracking configuration for intent monitoring.

    ```typescript
    const config = provider.getTrackingConfig();
    ```

### Provider Executor

A utility for managing multiple cross-chain providers and executing operations across them.

#### Methods

-   **createProviderExecutor**(config: ProviderExecutorConfig): ProviderExecutor

    Creates an executor instance for managing multiple providers.

    ```typescript
    import { createProviderExecutor } from "@wonderland/interop-cross-chain";

    const executor = createProviderExecutor({
        providers: [acrossProvider],
        sortingStrategy: SortingStrategyFactory.createStrategy("bestOutput"), // optional
        timeoutMs: 15000, // optional
        trackerFactory: new IntentTrackerFactory({ rpcUrls }), // optional
    });
    ```

#### ProviderExecutor Class

A class that manages multiple cross-chain providers and coordinates their operations.

-   **getQuotes**(params: GetQuoteRequest): Promise\<GetQuotesResponse\>

    Retrieves quotes from all available providers for a given operation.

    ```typescript
    const response = await executor.getQuotes({
        user: USER_INTEROP_ADDRESS, // user's interop address (binary format)
        intent: {
            intentType: "oif-swap",
            inputs: [
                {
                    user: USER_INTEROP_ADDRESS, // sender's interop address (binary format)
                    asset: INPUT_TOKEN_INTEROP_ADDRESS, // input token interop address (binary format)
                    amount: "1000000000000000000",
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
        supportedTypes: ["across"],
    });

    // Handle results
    if (response.quotes.length > 0) {
        const bestQuote = response.quotes[0];
    }
    response.errors.forEach((error) => console.error(error.errorMsg));
    ```

-   **track**(params: TrackParams): IntentTracker

    Starts tracking an executed transaction with real-time events.

    ```typescript
    const tracker = executor.track({
        txHash: hash,
        providerId: quote.provider,
        originChainId: 11155111,
        destinationChainId: 84532,
        timeout: 300000,
    });

    tracker.on("filled", (update) => console.log("Filled!", update.fillTxHash));
    ```

-   **getIntentStatus**(params: GetIntentStatusParams): Promise\<IntentStatusInfo\>

    Gets the current status of an intent without watching.

    ```typescript
    const status = await executor.getIntentStatus({
        txHash: "0x...",
        providerId: "across",
        originChainId: 11155111,
    });
    console.log(status.status); // 'opening' | 'opened' | 'filling' | 'filled' | 'expired'
    ```

### Sorting Strategies

#### SortingStrategyFactory

A factory for creating quote sorting strategies.

-   **createStrategy**(type: string): SortingStrategy

    Creates a sorting strategy instance.

    ```typescript
    import { SortingStrategyFactory } from "@wonderland/interop-cross-chain";

    const strategy = SortingStrategyFactory.createStrategy("bestOutput");
    ```

    Available strategies:

    -   `bestOutput` - Sorts quotes by highest output amount
    -   `lowerEta` - Sorts quotes by lowest estimated time of arrival

### Intent Tracker

A utility for tracking cross-chain intents from initiation to completion (EIP-7683 integration).

#### Methods

-   **createIntentTracker**(provider: CrossChainProvider, config: IntentTrackerConfig): IntentTracker

    Creates an intent tracker instance for a specific provider.

    ```typescript
    import { createIntentTracker } from "@wonderland/interop-cross-chain";

    const tracker = createIntentTracker(acrossProvider, {
        rpcUrls: {
            11155111: "https://sepolia.infura.io/v3/YOUR_API_KEY",
            84532: "https://base-sepolia.g.alchemy.com/v2/YOUR_API_KEY",
        },
    });
    ```

#### IntentTracker Class

A class that tracks cross-chain intents through their lifecycle.

-   **watchIntent**(params: WatchIntentParams): AsyncGenerator\<IntentUpdate\>

    Watches an intent and yields status updates as it progresses.

    ```typescript
    for await (const update of tracker.watchIntent({
        txHash: "0x...",
        originChainId: 11155111,
        destinationChainId: 84532,
        timeout: 300000, // Optional, in milliseconds
    })) {
        console.log(update.status, update.message);
        if (update.status === "filled") break;
    }
    ```

-   **getIntentStatus**(txHash: Hex, originChainId: number): Promise\<IntentStatusInfo\>

    Gets the current status of an intent without watching.

    ```typescript
    const status = await tracker.getIntentStatus("0x...", 11155111);
    console.log(status.status); // 'opening' | 'opened' | 'filling' | 'filled' | 'expired'
    ```

### Types

#### ExecutableQuote

```typescript
interface ExecutableQuote {
    order: Quote["order"];
    provider?: string;
    preparedTransaction?: PrepareTransactionRequestReturnType;
}
```

#### GetQuotesResponse

```typescript
interface GetQuotesResponse {
    quotes: ExecutableQuote[];
    errors: ProviderError[];
}
```

#### IntentStatusInfo

```typescript
interface IntentStatusInfo {
    status: "opening" | "opened" | "filling" | "filled" | "expired";
    orderId: Hex;
    openTxHash: Hex;
    user: Address;
    originChainId: number;
    destinationChainId: number;
    fillDeadline: number;
    depositId: bigint;
    inputAmount: bigint;
    outputAmount: bigint;
    fillEvent?: FillEvent;
}
```

#### IntentUpdate

```typescript
interface IntentUpdate {
    status: "opening" | "opened" | "filling" | "filled" | "expired";
    orderId?: Hex;
    openTxHash: Hex;
    fillTxHash?: Hex;
    timestamp: number;
    message: string;
}
```

#### FillEvent

```typescript
interface FillEvent {
    fillTxHash: Hex;
    blockNumber: bigint;
    timestamp: number;
    originChainId: number;
    depositId: bigint;
    relayer: Address;
    recipient: Address;
}
```

## References

-   [Cross-chain Protocol Standards](https://github.com/ethereum/ercs/blob/master/ERCS/erc-5164.md)
-   [EIP-7683: Cross Chain Intents](https://www.erc7683.org/)
-   [Open Intents Framework](https://github.com/openintentsframework)
