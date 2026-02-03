---
title: Interoperable Name
impact: FOUNDATION
tags: erc-7828, text, human-readable
---

# Interoperable Name

Human-readable text format for chain-specific addresses. Converts to/from Interoperable Address.

Structure: `<address>@<chain>#<checksum>`

## Syntax (BNF from ERC-7828)

```bnf
<address>  ::= [.-:_%a-zA-Z0-9]*
<chain>    ::= [.-:_a-zA-Z0-9]*
<checksum> ::= [0-9A-F]{8}
```

## Do
- ✅ Use for displaying addresses to users
- ✅ `<address>` can be raw address OR ENS name (e.g., `vitalik.eth`)
- ✅ `<chain>` can be CAIP identifier (`eip155:1`) OR ENS label (`ethereum`)
- ✅ Checksum is optional but recommended for raw addresses

## Don't
- ❌ Include checksum for ENS names → ENS resolution is dynamic, checksum would break
- ❌ Use for on-chain storage → use Interoperable Address instead
- ❌ Assume checksum guarantees correctness → it only verifies integrity

## Detecting `<chain>` type

**Rule from ERC-7828**: If the `<chain>` component does NOT contain a colon (`:`), it is interpreted as a label under the `on.eth` ENS namespace.

| Chain component | Type | Interpretation |
|-----------------|------|----------------|
| `eip155:1` | CAIP identifier | Contains `:` → direct CAIP-350 chain reference |
| `ethereum` | ENS label | No `:` → resolve `ethereum.on.eth` |
| `bip122:000...` | CAIP identifier | Contains `:` → Bitcoin mainnet |
| `bitcoin` | ENS label | No `:` → resolve `bitcoin.on.eth` |

## Detecting `<address>` type

**Rule from ERC-7828**: If the `<address>` component contains a period (`.`), it is assumed to be an ENS name.

| Address component | Type |
|-------------------|------|
| `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045` | Target address |
| `vitalik.eth` | ENS name |
| `wallet.ensdao.eth` | ENS name |

## Valid
- ✅ `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1#4CA88C9C` → raw address with CAIP chain and checksum
- ✅ `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@ethereum` → raw address with ENS label, no checksum
- ✅ `vitalik.eth@ethereum` → ENS name with chain label
- ✅ `vitalik.eth@eip155:1` → ENS name with CAIP identifier
- ✅ `bc1qwz2lhc40s8ty3l5jg3plpve3y3l82x9l42q7fk@bip122:000000000019d6689c085ae165831e93#597D21A1` → Bitcoin mainnet (CAIP)
- ✅ `bc1qwz2lhc40s8ty3l5jg3plpve3y3l82x9l42q7fk@bitcoin#597D21A1` → Bitcoin mainnet (ENS label)

## Invalid
- ❌ `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045` → missing chain context
- ❌ `vitalik.eth` → missing chain context (just an ENS name)

## Versioning

ERC-7828 does NOT define its own versioning mechanism—it inherits from ERC-7930.

Implementations MUST maintain convertibility between Interoperable Names and the corresponding ERC-7930 Interoperable Address binary format.

## The `on.eth` namespace

Chain labels are registered as subdomains of `on.eth` ENS name. The resolver for `on.eth`:

1. **Forward resolution** (label → chain data): Implements ENSIP-24 (Arbitrary Data Resolution)
   - Key: `interoperable-address`
   - Example: `ethereum.on.eth` resolves to `0x00010000010100`

2. **Reverse resolution** (chain data → label): Implements ENSIP-5 (Text Records)
   - Namespace: `reverse.on.eth`
   - Key format: `chain-label:<interop-address>`
   - Example: `chain-label:0x00010000010100` → `ethereum`

3. **Aliasing**: MAY support multiple labels (e.g., `op.on.eth` and `optimism.on.eth`) pointing to same chain
   - Reverse resolution always returns the **canonical** label

## ENS resolution flow

How `vitalik.eth@optimism` resolves to Interoperable Address:

```
1. Parse Interoperable Name
   ├── address: "vitalik.eth" (contains "." → ENS name)
   └── chain: "optimism" (no ":" → ENS label)

2. Resolve chain label via on.eth (ENSIP-24)
   ├── node = namehash("optimism.on.eth")
   ├── data = resolver.data(node, "interoperable-address")
   └── "optimism" → ChainType=0x0000, ChainRef=0x0a (chain ID 10)

3. Resolve ENS name for specific chain (ENSIP-9 + ENSIP-11)
   ├── coinType = 0x80000000 | chainId = 0x8000000a
   └── address = resolver.addr(namehash("vitalik.eth"), coinType)

4. Build Interoperable Address
   └── 0x0001 + 0000 + 01 + 0a + 14 + [resolved address]
```

**Relevant ENSIPs**:
- **ENSIP-5**: Text Records (used for reverse resolution)
- **ENSIP-9**: Multichain address resolution (`addr(node, coinType)`)
- **ENSIP-10**: Wildcard resolution (resolvers may return dynamic data)
- **ENSIP-11**: EVM chain coinType = `0x80000000 | chainId`
- **ENSIP-24**: Arbitrary Data Resolution (used for `interoperable-address` key)

## Migrating from CAIP-10

CAIP-10: `eip155:1:0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045`
Interop Name: `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1#4CA88C9C`

```
// CAIP-10 → Interoperable Name
function migrate(caip10: string): string {
  const [namespace, chainRef, address] = caip10.split(':')
  const chain = `${namespace}:${chainRef}`
  const checksum = calculateChecksum(namespace, chainRef, address)
  return `${address}@${chain}#${checksum}`
}
```

**Benefits of migration**: Checksum adds integrity verification that CAIP-10 lacks.

## Not to confuse with
- **Interoperable Address**: Binary format, for on-chain use, this converts to it
- **CAIP-10**: Similar text format but different structure (`eip155:1:0xd8dA...`)
- **ENS name**: Just the name (`vitalik.eth`), no chain context

## References
- [ERC-7828](https://eips.ethereum.org/EIPS/eip-7828)
- [ENSIP-9](https://docs.ens.domains/ensip/9/) - Multichain address resolution
- [ENSIP-11](https://docs.ens.domains/ensip/11/) - EVM compatible Chain Address Resolution
