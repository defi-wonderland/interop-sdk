---
title: API
---

### Cross-chain Providers

A set of classes and utilities for handling cross-chain operations through various protocols.

#### Methods

-   **createCrossChainProvider**(protocolName: string, config?: ProviderConfig): CrossChainProvider

    Creates a provider instance for a supported cross-chain protocol. Config is optional for Across (uses mainnet defaults), required for OIF.

    ```typescript
    import { createCrossChainProvider } from "@wonderland/interop-cross-chain";

    // Across - config optional (defaults to mainnet)
    const provider = createCrossChainProvider("across");

    // Across - with testnet config
    const testnetProvider = createCrossChainProvider("across", { isTestnet: true });

    // OIF - config required
    const oifProvider = createCrossChainProvider("oif", {
        solverId: "my-solver",
        url: "https://solver.example.com",
    });
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
        supportedTypes: ["across"], // provider-specific: "across", "oif-escrow-v0", "oif-user-open-v0"
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
    import {
        createProviderExecutor,
        OrderTrackerFactory,
        SortingStrategyFactory,
    } from "@wonderland/interop-cross-chain";

    const executor = createProviderExecutor({
        providers: [acrossProvider],
        sortingStrategy: SortingStrategyFactory.createStrategy("bestOutput"), // optional
        timeoutMs: 15000, // optional
        trackerFactory: new OrderTrackerFactory({ rpcUrls }), // optional
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
        supportedTypes: ["across"], // provider-specific: "across", "oif-escrow-v0", "oif-user-open-v0"
    });

    // Handle results
    if (response.quotes.length > 0) {
        const bestQuote = response.quotes[0];
    }
    response.errors.forEach((error) => console.error(error.errorMsg));
    ```

-   **track**(params: TrackParams): OrderTracker

    Starts tracking an executed transaction with real-time events.

    ```typescript
    import { OrderStatus } from "@wonderland/interop-cross-chain";

    const tracker = executor.track({
        txHash: hash,
        providerId: quote.provider,
        originChainId: 11155111,
        destinationChainId: 84532,
        timeout: 300000,
    });

    tracker.on(OrderStatus.Finalized, (update) => console.log("Finalized!", update.fillTxHash));
    ```

-   **getOrderStatus**(params: GetOrderStatusParams): Promise\<OrderTrackingInfo\>

    Gets the current status of an order without watching.

    ```typescript
    const status = await executor.getOrderStatus({
        txHash: "0x...",
        providerId: "across",
        originChainId: 11155111,
    });
    console.log(status.status); // OrderStatus
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

### Order Tracker

A utility for tracking cross-chain orders from initiation to completion (ERC-7683 open event parsing + fill watching).

#### Methods

-   **createOrderTracker**(provider: CrossChainProvider, config: OrderTrackerConfig): OrderTracker

    Creates an order tracker instance for a specific provider.

    ```typescript
    import { createOrderTracker } from "@wonderland/interop-cross-chain";

    const tracker = createOrderTracker(acrossProvider, {
        rpcUrls: {
            11155111: "https://sepolia.infura.io/v3/YOUR_API_KEY",
            84532: "https://base-sepolia.g.alchemy.com/v2/YOUR_API_KEY",
        },
    });
    ```

#### OrderTracker Class

A class that tracks cross-chain orders through their lifecycle.

-   **watchOrder**(params: WatchOrderParams): AsyncGenerator\<OrderTrackerYield\>

    Watches an order and yields status updates as it progresses.

    ```typescript
    import { OrderStatus, OrderTrackerYieldType } from "@wonderland/interop-cross-chain";

    for await (const item of tracker.watchOrder({
        txHash: "0x...",
        originChainId: 11155111,
        destinationChainId: 84532,
        timeout: 300000, // Optional, in milliseconds
    })) {
        if (item.type === OrderTrackerYieldType.Timeout) break;
        console.log(item.update.status, item.update.message);
        if (item.update.status === OrderStatus.Finalized) break;
    }
    ```

-   **getOrderStatus**(txHash: Hex, originChainId: number): Promise\<OrderTrackingInfo\>

    Gets the current status of an order without watching.

    ```typescript
    const status = await tracker.getOrderStatus("0x...", 11155111);
    console.log(status.status); // OrderStatus
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
    errors: { errorMsg: string; error: Error }[];
}
```

#### OrderTrackingInfo

```typescript
interface OrderTrackingInfo {
    status: OrderStatus;
    orderId: Hex;
    openTxHash: Hex;
    user: Address;
    originChainId: number;
    openDeadline: number;
    fillDeadline: number;
    fillEvent?: FillEvent;
    failureReason?: OrderFailureReason;
}
```

#### OrderTrackingUpdate

```typescript
interface OrderTrackingUpdate {
    status: OrderStatus;
    orderId?: Hex;
    openTxHash: Hex;
    fillTxHash?: Hex;
    timestamp: number;
    message: string;
    failureReason?: OrderFailureReason;
}
```

#### FillEvent

```typescript
interface FillEvent {
    fillTxHash: Hex;
    blockNumber: bigint;
    timestamp: number;
    originChainId: number;
    orderId: Hex;
    relayer: Address;
    recipient: Address;
}
```

## References

-   [Cross-chain Protocol Standards](https://github.com/ethereum/ercs/blob/master/ERCS/erc-5164.md)
-   [EIP-7683: Cross Chain Intents](https://www.erc7683.org/)
-   [Open Intents Framework](https://github.com/openintentsframework)
