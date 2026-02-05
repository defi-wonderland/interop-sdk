---
name: cross-chain-intents
description: Use when working with cross-chain value transfers, ERC-7683 intents, fillers, or settlement systems.
user-invocable: true
disable-model-invocation: false
---

# Cross-Chain Intents

## Motivation

Intent-based systems have become the preeminent solution for end-user cross-chain interaction by abstracting away the complexity and time constraints of traditional bridges. One key difficulty is accessing sufficient liquidity and active fillers across chains—this worsens as the number of chains increases.

By implementing a standard, cross-chain intents systems can interoperate and share infrastructure (order dissemination, filler networks), improving user experience through increased competition for fulfilling intents.

## When to use

- Implementing cross-chain transfer systems
- Building or integrating with fillers
- Working with settlement contracts (origin/destination)
- Validating or creating cross-chain orders

## Glossary

| Term | Definition |
|------|------------|
| **Origin Chain** | Chain where user sends funds |
| **Destination Chain** | Chain where intent executes and user receives funds (can be multiple) |
| **User** | End-user sending the order |
| **Filler** | Fulfills intent on destination, receives payment |
| **Leg** | Independent portion of intent; all must complete |
| **Settlement System** | Custodies deposits, verifies fills, pays fillers |
| **Settler** | Contract implementing settlement on a chain |

## Key concepts

| Concept | Description |
|---------|-------------|
| **GaslessCrossChainOrder** | User signs off-chain, filler calls `openFor()` |
| **OnchainCrossChainOrder** | User calls `open()` directly (NO openDeadline) |
| **ResolvedCrossChainOrder** | Generic representation after resolution |
| **orderData** | Arbitrary data (tokens, amounts, fees) |
| **fillerData** | Filler preferences (timing, payment form) |

## Standards relationship

```
┌─────────────────────────────────────────────────────────────────┐
│                        ERC-7683                                 │
│                  Cross-Chain Intents                            │
│           Standard API for cross-chain transfers                │
└───────────┬─────────────────────────────────┬───────────────────┘
            │ uses                            │ recommended for
            ▼                                 ▼
┌───────────────────────┐         ┌───────────────────────────────┐
│       EIP-712         │         │          Permit2              │
│  Typed structured     │         │     Nonce validation          │
│   data hashing        │         │     (implementation)          │
└───────────────────────┘         └───────────────────────────────┘
```

| Standard | Relationship | Notes |
|----------|--------------|-------|
| **ERC-7683** | Independent | Core cross-chain intents standard |
| **EIP-712** | Used by | `orderDataType` is an EIP-712 typehash |
| **Permit2** | Recommended | For nonce validation (not required) |
| **ERC-7930** | Complementary | Can be used for `bytes32` address fields (cross-chain compatibility) |

**Key insight**: ERC-7683 is intentionally minimal and agnostic—it defines the interface but NOT the settlement verification mechanism. This allows different settlement systems to compete while sharing infrastructure.

## Rules

### Order validation
- Order MUST be ABI decodable into `GaslessCrossChainOrder` or `OnchainCrossChainOrder`
- Order MUST be convertible into `ResolvedCrossChainOrder`
- `originSettler` MUST support the `orderDataType`
- OnchainCrossChainOrder has NO `openDeadline` (only `fillDeadline`)

### Address formats
- `Output.token`, `Output.recipient`, `destinationSettler` use `bytes32` (cross-chain compatibility)
- `address(0)` in `token` = native token (ETH)
- `address(0)` in `recipient` = filler unknown at creation

### Settlement interfaces
- Origin: `IOriginSettler` with `open()`, `openFor()`, `resolve()`, `resolveFor()`
- Destination: `IDestinationSettler` with `fill()`
- MUST emit `Open` event with resolved order

### originData handling
- `originData` is completely opaque
- Fillers pass it through without interpretation
- Settlement contracts decode it

### Security
- ERC-7683 is AGNOSTIC to settlement verification mechanism
- Fillers MUST evaluate settlement contract trustworthiness
- Applications MUST evaluate before creating user orders

## Implementation Guidelines

### Follow specs precisely
- Implementations MUST enable "competing, interoperable implementations" (EIP-1)
- RFC 2119 keywords (MUST, SHOULD, MAY) have normative meaning - follow them exactly
- When in doubt, prefer the spec's exact behavior over convenience

### Handle edge cases
- `address(0)` in `token` = native token (explicit sentinel value)
- `address(0)` in `recipient` = filler unknown at creation
- Order with multiple destination chains (multiple legs)
- Fill happening BEFORE `open` in some settlement systems
- Settlement verification is NOT standardized - evaluate each system

### Reference implementations
- We build reference implementations following the spec precisely
- Developer affordances (helper functions, better errors) MAY be added beyond 1:1 spec interface
- Affordances must NOT change the underlying spec behavior

### When you find ambiguity
- **Highlight it to the user** before proceeding
- Check if the ambiguity is documented in "Known ambiguities" below
- If new ambiguity found, consider opening an issue on the ERC repo

## Where to find updates

- **ERCs**: [ethereum/ERCs](https://github.com/ethereum/ERCs), [ethereum/EIPs](https://github.com/ethereum/EIPs)
- **Sub-types**: Check the subtypes repository for registered orderData and fillerData sub-types

**Status**: ERC-7683 is **Draft** (subject to change).

**Important**: Always check for new registered sub-types when implementing orderData or fillerData handling.

## Known ambiguities

- Settlement verification not standardized (future ERC expected)
- `nonce` validation is implementation-specific (Permit2 recommended)
- Fill can happen BEFORE `open` in some systems
- Exact behavior of `maxSpent`/`minReceived` with dynamic pricing is implementation-dependent

## Response Guidelines

When answering questions, always include the direct link to the specific standard:

| Standard | Direct Link |
|----------|-------------|
| ERC-7683 | https://github.com/ethereum/ERCs/blob/master/ERCS/erc-7683.md |
| EIP-712 | https://github.com/ethereum/EIPs/blob/master/EIPS/eip-712.md |
| EIP-1 | https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1.md |
| ERC-7930 | https://github.com/ethereum/ERCs/blob/master/ERCS/erc-7930.md |
| Sub-types registry | Check ERC-7683 for subtypes repository link |

**Link format pattern**:
- ERCs: `https://github.com/ethereum/ERCs/blob/master/ERCS/erc-{number}.md`
- EIPs: `https://github.com/ethereum/EIPs/blob/master/EIPS/eip-{number}.md`
- CAIPs: `https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-{number}.md`

Example response format:
> "The filler calls `openFor()` to submit... You can find the full specification in [ERC-7683](https://github.com/ethereum/ERCs/blob/master/ERCS/erc-7683.md)"

## Reference

See `references/reference.md` for detailed explanations and code.
