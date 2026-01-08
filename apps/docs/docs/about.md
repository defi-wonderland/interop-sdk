---
slug: "/"
title: Interop SDK
---

The _Interop SDK_ is a TypeScript library for cross-chain applications. It aims to bring the latest standards and interop best practices to wallet and app developers who want to provide their users with seamless multichain experiences.

## Core Modules

### `addresses`

The `addresses` module provides tools to work with **interoperable addresses** —a format designed to encode a recipient, a chain, and optionally a domain name (e.g., `alice.eth@eip155:1`).

> This is a reference implementation for [EIP-7930](https://eips.ethereum.org/EIPS/eip-7930), [ERC-7828](https://eips.ethereum.org/EIPS/eip-7828), and [CAIP-350](https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-350.md), the standards behind interoperable addresses

The module follows a clean three-layer architecture:

1. **Binary Layer (EIP-7930)**: Pure binary encoding/decoding - synchronous operations
2. **Text Layer (CAIP-350)**: Structured text representation - synchronous conversions
3. **Name Layer (ERC-7828)**: Human-readable names with ENS resolution - async operations

It includes utilities to:

-   Parse interoperable names (e.g., `vitalik.eth@eip155:1#4CA88C9C`)
-   Convert between name, structured text, and binary formats
-   Resolve ENS names to target addresses on supported chains
-   Validate checksums and chain references
-   Extract address and chain ID components from any format

This module standardizes how applications handle multi-chain addressing and ensures compatibility across chains and identity systems.

### `cross-chain`

> 🚧 This package is currently under development 🚧

The `cross-chain` module is responsible for managing the **intent workflow**: from user input to executable transfer strategies.

It includes logic to:

-   Parse and validate user-defined transfer intents (e.g., "Send 100 USDC to `bob.eth@oeth`")
-   Fetch quotes from cross-chain providers
-   Simulate gas, slippage, execution costs, and fallback routes
-   Track intent status from initiation to completion
-   Aggregate and compare quotes from multiple providers

This module acts as a routing engine and aggregator, designed to support declarative preferences while keeping users in control of execution.

## Wallets and Apps Integration

The Interop SDK is designed to be embedded into:

-   Wallets that want to offer native cross-chain transfers
-   Payment UIs or checkout flows with multichain support
-   Cross-chain bots, agents, or automation systems
-   Any app that wants to offer seamless multichain experiences

Developers remain in control of what chains, protocols, and assets to support through configuration and whitelisting.
