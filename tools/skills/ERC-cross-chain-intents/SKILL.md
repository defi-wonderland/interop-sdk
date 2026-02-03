---
name: cross-chain-intents
description: Use when working with cross-chain value transfers, ERC-7683 intents, fillers, or settlement systems.
user-invocable: true
disable-model-invocation: false
---

# Cross-Chain Intents

Standard API for cross-chain value transfer systems. Users express intents, fillers execute them.

## Motivation

Intent-based systems have become the preeminent solution for end-user cross-chain interaction by abstracting away the complexity and time constraints of traditional bridges. One of the key difficulties for cross-chain intents systems is accessing sufficient liquidity and a network of active fillers across chains.

By implementing a standard, cross-chain intents systems can interoperate and share infrastructure such as order dissemination services and filler networks, thereby improving end-user experience by increasing competition for fulfilling user intents.

## When to use

- When implementing cross-chain transfer systems
- When building or integrating with fillers
- When working with settlement contracts (origin/destination)
- When validating or creating cross-chain orders

## Glossary (from ERC-7683)

- **Origin Chain**: The chain where the user sends funds
- **Destination Chain**: The chain where the intent is executed and user receives funds (can be multiple)
- **User**: for the purposes of this document, the user is the end-user who is sending the order.
- **Filler**: Participant who fulfills a user intent on destination chain(s) and receives payment as a reward.
- **Leg**: A portion of the user intent that can be executed independently. All legs must be executed for fulfillment.
- **Settlement System**: System that custodies user deposits, verifies fills, and pays fillers for the purpose of facilitating intents.
- **Settler**: A contract that implements part of the settlement system on a particular chain
- **Intent**: User's desired outcome (transfer value from chain A to chain B) 

## Key concepts

- **GaslessCrossChainOrder**: Order signed off-chain by user, submitted by filler
- **OnchainCrossChainOrder**: Order submitted on-chain directly by user
- **ResolvedCrossChainOrder**: Generic order representation for fillers
- **orderData**: Arbitrary implementation-specific data (tokens, amounts, fees, etc.)
- **fillerData**: Filler-defined data for fill preferences (timing, payment form)

## Rule categories

- **concept-*** (FOUNDATION): Core definitions and flows
- **validation-*** (CRITICAL): Order validation rules
- **guide-*** (PRACTICAL): Implementation guidance
- **examples-*** (REFERENCE): Code examples from ERC

## Rules

### Concepts
- `concept-order-types`: GaslessCrossChainOrder vs OnchainCrossChainOrder
- `concept-resolved-order`: ResolvedCrossChainOrder structure
- `concept-filler`: Filler role and responsibilities
- `concept-settlement`: Origin and Destination settler interfaces
- `concept-fillerdata`: fillerData field and sub-types
- `concept-security`: Security considerations

### Validation
- `validation-order-fields`: Required fields and deadlines

### Guides
- `guide-customization`: Dutch auctions, Permit2, ordering flexibility

### Examples
- `examples-subtypes`: Message sub-type with Calls[]
