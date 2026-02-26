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

-   **getQuotes**(params: QuoteRequest): Promise\<Quote[]\>

    Fetches quotes from this provider using SDK-friendly types.

    ```typescript
    const quotes = await provider.getQuotes({
        user: { chainId: 11155111, address: "0xYourAddress..." },
        intent: {
            inputs: [
                { asset: { chainId: 11155111, address: "0xInputToken..." }, amount: "1000000" },
            ],
            outputs: [{ asset: { chainId: 84532, address: "0xOutputToken..." } }],
            swapType: "exact-input",
        },
    });
    ```

-   **submitOrder**(quote: Quote, signature: Hex): Promise\<SubmitOrderResponse\>

    Submits a signed order for gasless execution. Only implemented by providers that support solver submission (e.g., OIF). Throws `ProviderExecuteNotImplemented` by default.

    ```typescript
    const response = await provider.submitOrder(quote, signature);
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

-   **getQuotes**(params: QuoteRequest): Promise\<GetQuotesResponse\>

    Retrieves quotes from all available providers. Accepts SDK-friendly `QuoteRequest` with `InteropAccountId` addresses.

    ```typescript
    const response = await executor.getQuotes({
        user: { chainId: 11155111, address: "0xYourAddress..." },
        intent: {
            inputs: [
                {
                    asset: { chainId: 11155111, address: "0xInputToken..." },
                    amount: "1000000000000000000",
                },
            ],
            outputs: [
                {
                    asset: { chainId: 84532, address: "0xOutputToken..." },
                    // recipient defaults to user on the output chain if omitted
                },
            ],
            swapType: "exact-input",
        },
        supportedLocks: ["oif-escrow"], // optional: filter by lock mechanism
    });

    // Handle results
    if (response.quotes.length > 0) {
        const bestQuote = response.quotes[0];
    }
    response.errors.forEach((error) => console.error(error.errorMsg));
    ```

-   **submitOrder**(quote: ExecutableQuote, signatureOrResults: Hex | StepResult[]): Promise\<SubmitOrderResponse\>

    Submits a signature-step order to the solver. For transaction-step orders, send the transaction directly instead.

    ```typescript
    // Single signature (most common)
    const step = quote.order.steps[0]; // SignatureStep
    const signature = await walletClient.signTypedData(step.signaturePayload);
    const { orderId } = await executor.submitOrder(quote, signature);

    // Or with StepResult[] for multi-step orders
    const results = [{ stepIndex: 0, signature }];
    await executor.submitOrder(quote, results);
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

#### InteropAccountId

A readable chain-aware account/asset identifier that replaces opaque ERC-7930 hex in the public API.

```typescript
interface InteropAccountId {
    chainId: number; // EVM chain ID
    address: string; // EIP-55 checksummed hex address
}
```

#### QuoteRequest

SDK-friendly quote request with `InteropAccountId` addresses.

```typescript
interface QuoteRequest {
    user: InteropAccountId;
    intent: {
        inputs: Array<{ asset: InteropAccountId; amount?: string }>;
        outputs: Array<{
            asset: InteropAccountId;
            amount?: string;
            recipient?: InteropAccountId; // defaults to user on output chain
            calldata?: string;
        }>;
        swapType?: "exact-input" | "exact-output";
    };
    supportedLocks?: string[]; // e.g. ["oif-escrow", "compact-resource-lock"]
}
```

#### ExecutableQuote

A quote with a step-based order and readable preview addresses.

```typescript
interface ExecutableQuote {
    order: Order;
    preview: {
        inputs: Array<{ account: InteropAccountId; asset: InteropAccountId; amount: string }>;
        outputs: Array<{ account: InteropAccountId; asset: InteropAccountId; amount: string }>;
    };
    provider: string;
    eta?: number;
    validUntil?: number;
    quoteId?: string;
    failureHandling?: string;
    partialFill?: boolean;
    metadata?: Record<string, unknown>;
    /** @internal */ _providerId: string;
}
```

#### Order

A unified order describing what the user must do. Steps are ordered — execute sequentially.

```typescript
interface Order {
    steps: (SignatureStep | TransactionStep)[];
    lock?: { type: string; contracts?: string[] };
    checks?: {
        allowances?: Array<{
            token: InteropAccountId;
            owner: string;
            spender: string;
            required: string;
        }>;
    };
    metadata?: Record<string, unknown>;
}

interface SignatureStep {
    kind: "signature";
    chainId: number;
    description?: string;
    signaturePayload: {
        signatureType: "eip712";
        domain: Record<string, unknown>;
        primaryType: string;
        types: Record<string, Array<{ name: string; type: string }>>;
        message: Record<string, unknown>;
    };
    metadata?: Record<string, unknown>;
}

interface TransactionStep {
    kind: "transaction";
    chainId: number;
    description?: string;
    transaction: {
        to: string;
        data: string;
        value?: string;
        gas?: string;
        maxFeePerGas?: string;
        maxPriorityFeePerGas?: string;
    };
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

### Utilities

-   **toInteropAccountId**(hex: string): InteropAccountId — Decode an ERC-7930 hex address into `{ chainId, address }`.
-   **fromInteropAccountId**(id: InteropAccountId): Address — Encode an `InteropAccountId` to ERC-7930 hex.
-   **getSignatureSteps**(order: Order): SignatureStep[] — Get all signature steps from an order.
-   **getTransactionSteps**(order: Order): TransactionStep[] — Get all transaction steps from an order.
-   **isSignatureOnlyOrder**(order: Order): boolean — Check if an order requires only signatures.
-   **isTransactionOnlyOrder**(order: Order): boolean — Check if an order requires only transactions.

```typescript
import {
    fromInteropAccountId,
    getSignatureSteps,
    isSignatureOnlyOrder,
    toInteropAccountId,
} from "@wonderland/interop-cross-chain";

// Convert between ERC-7930 hex and readable format
const id = toInteropAccountId("0x00010000010114a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
// { chainId: 1, address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" }

const hex = fromInteropAccountId({
    chainId: 8453,
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
});

// Inspect order steps
const sigSteps = getSignatureSteps(quote.order);
if (isSignatureOnlyOrder(quote.order)) {
    // Only needs signatures, no user transactions
}
```

## References

-   [Cross-chain Protocol Standards](https://github.com/ethereum/ercs/blob/master/ERCS/erc-5164.md)
-   [EIP-7683: Cross Chain Intents](https://www.erc7683.org/)
-   [Open Intents Framework](https://github.com/openintentsframework)
