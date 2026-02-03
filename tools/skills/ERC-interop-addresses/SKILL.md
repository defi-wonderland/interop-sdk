---
name: interop-addresses
description: Use when working with chain-specific addresses, Interoperable Addresses (ERC-7930), Interoperable Names (ERC-7828), or CAIP-350 chain identifiers.
user-invocable: true
disable-model-invocation: false
---

# Interoperable Addresses

Standards for representing addresses with chain context. Enables unambiguous cross-chain address identification.

## Motivation 

The address format used on Ethereum mainnet (ERC-55) is shared by many blockchains but **does not encode chain information**, creating ambiguity and operational risk. With hundreds of L2s sharing the same address format, an address alone is insufficient to determine which chain it targets—funds can be sent to an unreachable address on the wrong chain.

Each protocol has defined ad hoc ways to represent address+chain combinations, leading to fragmentation. These standards solve this by providing:

- **ERC-7930**: A compact binary format for on-chain use (smart contracts, message passing)
- **ERC-7828**: A human-readable text format for user-facing interactions
- **CAIP-350**: A meta-standard defining how each blockchain namespace serializes its addresses into the binary format

## When to use

- When working with addresses that need chain context (cross-chain scenarios)
- When converting between binary (on-chain) and text (human-readable) address formats
- When validating chain-specific address structures
- When implementing ERC-7930, ERC-7828, or CAIP-350

## Key concepts

- **Interoperable Address**: Binary format binding address + chain. For on-chain use. (ERC-7930)
- **Interoperable Name**: Text format `addr@chain#checksum`. For humans. (ERC-7828)
- **Target Address**: Raw address without chain context (e.g., `0xd8dA6BF...`)
- **Chain-specific Address**: Any format that includes both target address AND chain (Interop Address, Interop Name, ERC-3770)
- **ChainType**: 2-byte namespace identifier from CAIP-350 (e.g., `0x0000` = EVM)
- **ChainReference**: Chain identifier within a namespace (e.g., `1` = Ethereum mainnet)

## Rule categories

- **concept-*** (FOUNDATION): Core definitions you must know
- **validation-*** (CRITICAL): Rules that cause errors if ignored
- **guide-*** (PRACTICAL): Implementation guides with code examples

## Rules

### Concepts
- `concept-interop-address`: Binary format structure, parsing byte-by-byte, versioning rules
- `concept-interop-name`: Text format structure, ENS resolution, `on.eth` namespace
- `concept-target-address`: Raw address without chain context
- `concept-chain-type`: ChainType and ChainReference identifiers, CAIP-350 profiles

### Validation
- `validation-binary-fields`: Version and length field rules
- `validation-checksum`: Checksum calculation, what it detects vs what it doesn't

### Guides
- `guide-parsing`: Parsing/building pseudocode, Solidity implementation, chain configurations
- `guide-security`: Canonicity considerations, ENS normalization, address poisoning
