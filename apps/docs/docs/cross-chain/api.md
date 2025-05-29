---
title: API
---

### Cross-chain Providers

A set of classes and utilities for handling cross-chain operations through various protocols.

#### Methods

-   **createCrossChainProvider(protocolName: string, config?: ProviderConfig, dependencies?: Dependencies): CrossChainProvider**

    Creates a provider instance for a supported cross-chain protocol.

    ```typescript
    const provider = createCrossChainProvider("across");
    ```

#### CrossChainProvider Class

An abstract class that defines the interface for cross-chain protocol providers.

-   **getProtocolName(): string**

    Returns the name of the protocol this provider implements.

    ```typescript
    const protocolName = provider.getProtocolName(); // e.g., "across"
    ```

-   **getQuote(action: CrossChainAction, params: QuoteParams): Promise\<Quote\>**

    Fetches a quote for a cross-chain operation.

    ```typescript
    const quote = await provider.getQuote("crossChainTransfer", {
        fromChain: "1",
        toChain: "10",
        token: "0x...",
        amount: "1000000000000000000",
    });
    ```

-   **simulateOpen(openParams: OpenParams): Promise\<TransactionRequest[]\>**

    Simulates the open transaction for a given quote.

    ```typescript
    const txs = await provider.simulateOpen(quote);
    ```

-   **validateOpenParams(openParams: OpenParams): Promise\<boolean\>**

    Validates the parameters for opening a cross-chain transaction.

    ```typescript
    const isValid = await provider.validateOpenParams(quote);
    ```

### Provider Executor

A utility for managing multiple cross-chain providers and executing operations across them.

#### Methods

-   **createProviderExecutor(providers: CrossChainProvider[], dependencies?: Dependencies): ProviderExecutor**

    Creates an executor instance for managing multiple providers.

    ```typescript
    const executor = createProviderExecutor([
        acrossProvider,
        layerZeroProvider,
        // other providers
    ]);
    ```

#### ProviderExecutor Class

A class that manages multiple cross-chain providers and coordinates their operations.

-   **getQuotes(action: CrossChainAction, params: QuoteParams): Promise\<Quote\[\]\>**

    Retrieves quotes from all available providers for a given operation.

    ```typescript
    const quotes = await executor.getQuotes("crossChainTransfer", {
        fromChain: "1",
        toChain: "10",
        token: "0x...",
        amount: "1000000000000000000",
    });
    ```

-   **execute(quote: Quote): Promise\<TransactionResult\>**

    Executes a cross-chain operation using the specified quote.

    ```typescript
    const result = await executor.execute(selectedQuote);
    ```

### Param Parsers

Utilities for parsing and validating parameters used in cross-chain operations.

#### InteropAddressParamsParser

A utility class for parsing interoperable addresses used in cross-chain operations.

```typescript
const parser = new InteropAddressParamsParser();
const parsedAddress = parser.parse("alice.eth@eip155:1#ABCD1234");
```

## References

-   [Cross-chain Protocol Standards](https://github.com/ethereum/ercs/blob/master/ERCS/erc-5164.md)
