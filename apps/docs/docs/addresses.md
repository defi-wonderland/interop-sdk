---
title: Addresses
---

The `addresses` package handles interoperable blockchain addresses — a format that encodes a recipient, a chain, and optionally a domain name into a single string (e.g., `vitalik.eth@eip155:1#4CA88C9C`).

It is a reference implementation of [EIP-7930](https://eips.ethereum.org/EIPS/eip-7930), [ERC-7828](https://eips.ethereum.org/EIPS/eip-7828), and [CAIP-350](https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-350.md).

## What it does

-   Parse and format human-readable interoperable names (ERC-7828)
-   Encode and decode binary interoperable addresses (EIP-7930)
-   Resolve ENS names and chain shortnames automatically
-   Validate checksums and address structure
-   Convert between name, address, and binary formats

## Architecture

The package follows a two-layer design:

1. **Address Layer** — synchronous encoding/decoding of structured address objects (binary or text representation)
2. **Name Layer** — async operations that involve ENS resolution or chain label resolution

See [Concepts](./addresses/concepts.md) for a deeper explanation of the architecture and the standards.

## Where to start

| I want to...                 | Go to                                                   |
| ---------------------------- | ------------------------------------------------------- |
| Try it out                   | [Getting Started](./addresses/getting-started.md)       |
| Understand the design        | [Concepts](./addresses/concepts.md)                     |
| See a real-world walkthrough | [Parsing an Interoperable Name](./addresses/example.md) |
| Learn advanced patterns      | [Advanced Usage](./addresses/advanced-usage.md)         |
| Look up a function signature | [API Reference](./addresses/api.md)                     |
