---
title: API
---

### Cross-chain Providers

A set of classes and utilities for handling cross-chain operations through various protocols.

#### Methods

-   **createCrossChainProvider**(protocolName: string, config?: ProviderConfig, dependencies?: Dependencies): [CrossChainProvider](https://github.com/defi-wonderland/interop-sdk/blob/01f1d90f74ab4a36ed9a71d54099e822ad984094/packages/cross-chain/src/interfaces/crossChainProvider.interface.ts#L84)

    Creates a provider instance for a supported cross-chain protocol.

    ```typescript
    const provider = createCrossChainProvider("across");
    ```

#### [CrossChainProvider Class](https://github.com/defi-wonderland/interop-sdk/blob/01f1d90f74ab4a36ed9a71d54099e822ad984094/packages/cross-chain/src/interfaces/crossChainProvider.interface.ts#L84)

An abstract class that defines the interface for cross-chain protocol providers.

-   **getProtocolName**(): string

    Returns the name of the protocol this provider implements.

    ```typescript
    const protocolName = provider.getProtocolName(); // e.g., "across"
    ```

-   **getQuote**(action: CrossChainAction, params: QuoteParams): Promise\<[Quote](https://github.com/defi-wonderland/interop-sdk/blob/01f1d90f74ab4a36ed9a71d54099e822ad984094/packages/cross-chain/src/interfaces/crossChainProvider.interface.ts#L79)\>

    Fetches a quote for a cross-chain operation.

    ```typescript
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

-   **simulateOpen**(openParams: OpenParams): Promise\<TransactionRequest[]\>

    Simulates the open transaction for a given quote. This method validates parameters before simulating.

    ```typescript
    const txs = await provider.simulateOpen(quote.openParams);
    ```

-   **validateOpenParams**(openParams: OpenParams): Promise\<boolean\>

    Validates the parameters for opening a cross-chain transaction.

    ```typescript
    const txs = await provider.simulateOpen(quote.openParams);
    ```

### Provider Executor

A utility for managing multiple cross-chain providers and executing operations across them.

#### Methods

-   **createProviderExecutor**(providers: CrossChainProvider[], dependencies?: Dependencies): [ProviderExecutor](https://github.com/defi-wonderland/interop-sdk/blob/01f1d90f74ab4a36ed9a71d54099e822ad984094/packages/cross-chain/src/services/providerExecutor.ts#L28)

    Creates an executor instance for managing multiple providers.

    ```typescript
    const executor = createProviderExecutor([
        acrossProvider,
        // other providers
    ]);
    ```

#### [ProviderExecutor Class](https://github.com/defi-wonderland/interop-sdk/blob/01f1d90f74ab4a36ed9a71d54099e822ad984094/packages/cross-chain/src/services/providerExecutor.ts#L28)

A class that manages multiple cross-chain providers and coordinates their operations.

-   **getQuotes**(action: CrossChainAction, params: QuoteParams): Promise\<[Quote\[\]](https://github.com/defi-wonderland/interop-sdk/blob/01f1d90f74ab4a36ed9a71d54099e822ad984094/packages/cross-chain/src/interfaces/crossChainProvider.interface.ts#L79)\>

    Retrieves quotes from all available providers for a given operation.

    ```typescript
    const quotes = await executor.getQuotes("crossChainTransfer", {
        sender: "0x...",
        recipient: "0x...",
        inputTokenAddress: "0x...",
        outputTokenAddress: "0x...",
        inputAmount: "1000000000000000000",
        inputChainId: 11155111,
        outputChainId: 84532,
    });
    ```

-   **execute**(quote: Quote): Promise\<TransactionRequest[]\>

    Executes a cross-chain operation using the specified quote.

    ```typescript
    const result = await executor.execute(selectedQuote);
    ```

### Quote Aggregator

A utility for fetching and comparing quotes from multiple providers with sorting and timeout handling.

#### Methods

-   **createQuoteAggregator**(providers?: SupportedProtocols[]): [QuoteAggregator](https://github.com/defi-wonderland/interop-sdk/blob/01f1d90f74ab4a36ed9a71d54099e822ad984094/packages/cross-chain/src/services/quoteAggregator.ts#L23)

    Creates a quote aggregator instance.

    ```typescript
    const aggregator = createQuoteAggregator(["across"]);
    ```

#### [QuoteAggregator Class](https://github.com/defi-wonderland/interop-sdk/blob/01f1d90f74ab4a36ed9a71d54099e822ad984094/packages/cross-chain/src/services/quoteAggregator.ts#L23)

A class that fetches quotes from multiple providers in parallel and sorts them by specified criteria.

-   **getQuotes**(params: GetQuotesParams): Promise\<QuoteResult[]\>

    Fetches quotes from all configured providers with optional sorting and timeout.

    ```typescript
    const results = await aggregator.getQuotes({
        action: "crossChainTransfer",
        params: {
            sender: "0x...",
            recipient: "0x...",
            inputTokenAddress: "0x...",
            outputTokenAddress: "0x...",
            inputAmount: "1000000000000000000",
            inputChainId: 11155111,
            outputChainId: 84532,
        },
        sorting: SortingCriteria.BEST_OUTPUT, // Optional
        timeout: 10000, // Optional, in milliseconds
    });
    ```

### Intent Tracker

A utility for tracking cross-chain intents from initiation to completion (EIP-7683 integration).

#### Methods

-   **createIntentTracker**(protocol: "across", config?: IntentTrackerConfig): [IntentTracker](https://github.com/defi-wonderland/interop-sdk/blob/01f1d90f74ab4a36ed9a71d54099e822ad984094/packages/cross-chain/src/services/IntentTracker.ts#L19)

    Creates an intent tracker instance for a specific protocol.

    ```typescript
    const tracker = createIntentTracker("across");
    ```

#### [IntentTracker Class](https://github.com/defi-wonderland/interop-sdk/blob/01f1d90f74ab4a36ed9a71d54099e822ad984094/packages/cross-chain/src/services/IntentTracker.ts#L19)

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

-   **getIntentStatus**(txHash: string, originChainId: number): Promise\<IntentStatusInfo\>

    Gets the current status of an intent without watching.

    ```typescript
    const status = await tracker.getIntentStatus("0x...", 11155111);
    console.log(status.status); // 'opening' | 'opened' | 'filling' | 'filled' | 'expired'
    ```

### Param Parsers

Utilities for parsing and validating parameters used in cross-chain operations.

#### [InteropAddressParamsParser](https://github.com/defi-wonderland/interop-sdk/blob/01f1d90f74ab4a36ed9a71d54099e822ad984094/packages/cross-chain/src/services/InteropAddressParamsParser.ts#L50)

A utility class for parsing interoperable addresses used in cross-chain operations.

```typescript
const parser = new InteropAddressParamsParser();
const parsedParams = await parser.parseGetQuoteParams("crossChainTransfer", {
    sender: "alice.eth@eip155:1#ABCD1234",
    recipient: "0x...",
    amount: "1000000000000000000",
    inputTokenAddress: "0x...",
    outputTokenAddress: "0x...",
});
```

## References

-   [Cross-chain Protocol Standards](https://github.com/ethereum/ercs/blob/master/ERCS/erc-5164.md)
-   [EIP-7683: Open Intent Framework](https://www.erc7683.org/)
