---
slug: "/"
title: Interop SDK
---

The _Interop SDK_ is a TypeScript library for cross-chain applications. It aims to bring the latest standards and interop best practices to wallet and app developers who want to provide their users with seamless multichain experiences.

## Core Modules

### `addresses`

The `addresses` module provides tools to work with **interoperable addresses** —a format designed to encode a recipient, a chain, and optionally a domain name (e.g., `alice.eth@arb1`).

> This is a reference implementation for ERC-7930 and ERC-7828, the standards behind interoperable addresses

It includes utilities to:

-   Parse human-readable interoperable addresses
-   Convert to and from [ERC-7930](https://eips.ethereum.org/EIPS/eip-7930)-compatible address formats
-   Resolve ENS names to target addresses on supported chains
-   Validate checksums and shortnames

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
