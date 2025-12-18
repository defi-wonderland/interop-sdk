---
title: Flow
---

This document provides an overview of the cross-chain transaction flow using the Interop SDK. It illustrates how a developer can interact with different cross-chain protocols, specifically Across, to obtain quotes, simulate transactions, and execute them on-chain. The flow diagram below details the sequence of interactions between the developer, the SDK, the protocol services, and the blockchain RPC endpoint.

```mermaid
sequenceDiagram
    participant dev as Dev
    participant sdk as Interop SDK
    participant across as Across
    participant rpc as RPC
    participant tracker as Intent Tracker

    Note over dev,tracker: Quote Phase
    dev->>+sdk: Get Quote: Input, Across
    sdk->>+across: Get Quote: Input
    across-->>-sdk: Quote
    sdk-->>-dev: Quote Response

    Note over dev,tracker: Execution Phase
    dev->>+sdk: Simulate Open: Quote, Across
    sdk->>+across: Simulate Open: Quote
    across-->>-sdk: Tx to Execute
    sdk-->>-dev: Transaction Requests

    dev->>+rpc: Send Transaction(s)
    rpc-->>-dev: Transaction Hash

    Note over dev,tracker: Tracking Phase
    dev->>+tracker: Watch Intent: txHash, chains
    loop Until Filled or Expired
        tracker->>tracker: Check Open Event
        tracker->>tracker: Check Fill Event
        tracker-->>dev: Status Update
    end
    tracker-->>-dev: Final Status (Filled/Expired)
```

## Flow Stages

### 1. Quote Phase

The developer requests a quote from the SDK, which queries the provider protocol for pricing and availability.

### 2. Execution Phase

After reviewing the quote, the developer simulates the transaction to get the exact transaction data, then sends it to the blockchain.

### 3. Tracking Phase

Once the transaction is submitted, the developer can use the Intent Tracker to monitor the cross-chain transfer status in real-time, receiving updates as the intent progresses through its lifecycle (opening → opened → filling → filled/expired).

## Additional Features

The SDK also supports:

-   **Quote Aggregation**: Compare quotes from multiple providers simultaneously
-   **Intent Tracking**: Monitor cross-chain transfers from initiation to completion
-   **Error Handling**: Graceful handling of timeouts and provider errors

See the [Intent Tracking](./intent-tracking.md) and [Quote Aggregator](./quote-aggregator.md) guides for more details.
