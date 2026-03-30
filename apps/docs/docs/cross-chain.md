---
title: Cross-Chain
---

The `cross-chain` package provides a standardized interface for cross-chain token transfers. It lets you fetch quotes from multiple bridge providers, execute transfers, and track orders through a unified API.

It follows [EIP-7683](https://www.erc7683.org/) for cross-chain intent structures.

## What it does

-   Fetch and compare quotes from multiple providers (Across, Relay, OIF, LiFi)
-   Execute cross-chain transfers via signature (gasless) or transaction
-   Track orders from initiation to completion
-   Aggregate quotes with configurable sorting strategies

## Where to start

| I want to...                 | Go to                                                                                                                      |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Try it out                   | [Getting Started](./cross-chain/getting-started.md)                                                                        |
| Understand the design        | [Concepts](./cross-chain/concepts.md)                                                                                      |
| See the transfer flow        | [Flow](./cross-chain/flow.md)                                                                                              |
| Set up a specific provider   | [Across](./cross-chain/across-provider.md), [Relay](./cross-chain/relay-provider.md), [OIF](./cross-chain/oif-provider.md) |
| Monitor a transfer           | [Order Tracking](./cross-chain/intent-tracking.md)                                                                         |
| Learn advanced patterns      | [Advanced Usage](./cross-chain/advanced-usage.md)                                                                          |
| Look up a function signature | [API Reference](./cross-chain/api.md)                                                                                      |
