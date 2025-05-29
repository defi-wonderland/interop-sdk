---
slug: "/"
title: Interop SDK
---

The **Interop SDK** is a developer-first toolkit for building intent-based, cross-chain transfer experiences. It abstracts away the complexity of bridging, swapping, and routing across chains by letting users express what they want to do—and resolving how to do it under the hood.

Interop introduces a clean separation of concerns between **intent resolution** and **protocol execution**, making it easy to build wallets or apps that support seamless, programmable value transfer across multiple networks.

## Core Modules

### `@interop-sdk/addresses`

The `addresses` module provides tools to work with **interoperable addresses**—a format designed to encode a recipient, a chain, and optionally a domain name (e.g., `alice.eth@arbitrum`).

It includes utilities to:

-   Parse human-readable interoperable addresses
-   Convert to and from [ERC-7930](https://ethereum-magicians.org/t/erc-7930-interoperable-addresses/23365)-compatible address formats
-   Resolve ENS names to target addresses on supported chains
-   Validate checksums and shortnames

This module standardizes how applications handle multi-chain addressing and ensures compatibility across chains and identity systems.

### `@interop-sdk/cross-chain`

The `cross-chain` module is responsible for managing the **intent workflow**: from user input to executable transfer strategies.

It includes logic to:

-   Parse and validate user-defined transfer intents (e.g., "Send 100 USDC to `bob.eth@optimism`")
-   Simulate gas, slippage, execution costs, and fallback routes
-   Expose a programmable interface to override routing preferences (e.g., token/chain constraints, protocol filters)

This module acts as a routing engine and aggregator, designed to support declarative preferences while keeping users in control of execution.

## Intent-Centric Architecture

Interop moves away from protocol-first flows and embraces an **intent-first model**. Instead of exposing low-level swap/bridge UIs, apps powered by the SDK can surface high-level actions like:

> _“Send 100 USDC to `alice.eth@arbitrum`”_

The SDK takes care of:

-   Identifying available balances across chains
-   Evaluating route feasibility (including gas and liquidity constraints)
-   Selecting the best strategy
-   Returning a signed, executable plan

This reduces surface area for user error, increases composability, and makes the experience smoother for both devs and users.

## Wallets and Apps Integration

The Interop SDK is designed to be embedded into:

-   Wallets that want to offer native cross-chain transfers
-   Payment UIs or checkout flows with multi-chain support
-   Cross-chain bots, agents, or automation systems
-   Any app that wants to offer seamless value movement

Developers remain in control of what chains, protocols, and assets to support through configuration and whitelisting.

## No Assumptions, Just Abstractions

Interop SDK does not dictate UX or execution models—it provides the **tools** to:

-   Parse interoperable addresses
-   Build intent resolution pipelines
-   Aggregate routes across protocols
-   Simulate, quote, and resolve transfers
