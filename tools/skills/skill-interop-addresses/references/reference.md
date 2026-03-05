# Reference

Organized by workflow: Understand → Build → Validate → Security

---

## 1. Understand

### Interoperable Address (ERC-7930)
Binary format binding address + chain. For on-chain use.

```
┌─────────┬───────────┬──────────────────────┬────────────────┬───────────────┬─────────┐
│ Version │ ChainType │ ChainReferenceLength │ ChainReference │ AddressLength │ Address │
│  2B     │    2B     │         1B           │     var        │      1B       │   var   │
└─────────┴───────────┴──────────────────────┴────────────────┴───────────────┴─────────┘
```

### Interoperable Name (ERC-7828)
Human-readable text format.

**Syntax (BNF)**:
```bnf
<interoperable-name>  ::= <address> "@" <chain> [ "#" <checksum> ]
<address>             ::= [.-:_%a-zA-Z0-9]*
<chain>               ::= [.-:_a-zA-Z0-9]*
<checksum>            ::= [0-9A-F]{8}
```

**Detecting types**:
- `<chain>` contains `:` → CAIP identifier (`eip155:1`)
- `<chain>` no `:` → ENS label (resolves `ethereum.on.eth`)
- `<address>` contains `.` → ENS name (`vitalik.eth`)
- `<address>` no `.` → raw target address

### Target Address
Raw address without chain context. Same address on different chains may have different owners.

### ChainType (CAIP-350)
2-byte namespace identifier:
- `0x0000` = EVM (eip155)
- `0x0002` = Solana

Full list: [CASA Namespaces Registry](https://github.com/ChainAgnostic/namespaces)

### ChainReference
Chain identifier within namespace. Variable length, binary representation per CAIP-350 profile.

ERC-7930 examples:
- Ethereum mainnet: ChainRef = `0x01` (chain ID 1)
- Solana mainnet: ChainRef = 32-byte genesis blockhash

### CAIP-350: Companion Standard
CAIP-350 is the companion standard to ERC-7930, providing namespace profiles that define how each blockchain serializes addresses.

**Required conversions per profile**:
- **Chain References**: customary text ↔ standard text ↔ binary
- **Addresses**: customary text ↔ standard text ↔ binary

**Chain Identifier Text Representation**:
```
<namespace>:<chainReference>
```
Where `<namespace>` is the CAIP-104 identifier (e.g., `eip155`, `solana`, `bip122`).

**Key requirements**:
- Each profile MUST define exactly ONE 2-byte ChainType
- Each profile MUST state whether its standard text differs from CAIP-2/CAIP-10, and how
- Living ERCs are unusual in Ethereum, so separating allows ERC-7930 to finalize while CAIP-350 profiles can be added per-namespace by ecosystem maintainers

---

## 2. Build

### ENS resolution (on.eth namespace)

The `on.eth` resolver MUST implement:
- **ENSIP-24** for forward resolution (label → chain data)
- **ENSIP-5** for reverse resolution (chain data → label)

```js
// Forward: label → chain data (ENSIP-24)
const interopAddress = resolver.data(namehash("ethereum.on.eth"), "interoperable-address");
// Returns: 0x00010000010100

// Reverse: chain data → label (ENSIP-5)
const label = resolver.text(namehash("reverse.on.eth"), "chain-label:0x00010000010100");
// Returns: "ethereum"
```

**Forward resolution key**: `interoperable-address`
**Reverse resolution key format**: `chain-label:<interoperable-address>`

**Canonical label behavior**: While multiple labels (e.g., `op.on.eth` and `optimism.on.eth`) may resolve to the same Interoperable Address, reverse resolution will always return the single canonical label (e.g., `optimism`).

### Address Resolution (ERC-7828)

If `<address>` contains `.` (ENS name), resolve subject to:
- **ENSIP-9**: Multichain address resolution
- **ENSIP-10**: Wildcard resolution
- **ENSIP-11**: EVM compatible Chain Address Resolution

Consideration MUST be given to both current and future ENSIPs pertaining to address resolution.

---

## 3. Validate

### Valid Interoperable Addresses (from ERC-7930)
- `0x00010000010114d8da6bf26964af9d7eed9e03e53415d37aa96045` - Ethereum mainnet
- `0x000100022045296998a6f8e2a784db5d9f95e18fc23f70441a1039446801089879b08c7ef02005333498d5aea4ae009585c43f7b8c30df8e70187d4a713d134f977fc8dfe0b5` - Solana mainnet
- `0x000100000014d8da6bf26964af9d7eed9e03e53415d37aa96045` - Any EVM (ChainRefLen=0)
- `0x000100022045296998a6f8e2a784db5d9f95e18fc23f70441a1039446801089879b08c7ef000` - Solana mainnet network, no address (AddressLength=0)

### Invalid Interoperable Address
- Both `ChainReferenceLength` and `AddressLength` = 0 is INVALID (ERC-7930: "AddressLength MUST NOT be zero if the ChainReferenceLength is also zero")

### Valid Interoperable Names
- `0xd8dA...@eip155:1#4CA88C9C` - raw + CAIP + checksum
- `0xd8dA...@ethereum` - raw + ENS label
- `vitalik.eth@ethereum` - ENS name + label
- `bc1qwz2lhc...@bitcoin#597D21A1` - Bitcoin

### CAIP-2/CAIP-10 backward compatibility

- **Problematic**: Requires extra resources (e.g., Solana truncated hash → full). Clients SHOULD support.
- **Impossible**: Can't represent (e.g., chainId > 10^32, no registered ChainType).

**CAIP-2 limitation**: Chain reference limited to 32 characters. This means CAIP-2 cannot losslessly represent some chains (e.g., Solana uses leading 32 characters of base58btc-encoded genesis blockhash, which is not uniquely deterministic).

Client libraries SHOULD produce different errors for these cases.

### Parsing
To parse an Interoperable Address, read fields sequentially per the structure in Section 1:
1. **Version** (2 bytes) - must be `0x0001`
2. **ChainType** (2 bytes) - namespace identifier
3. **ChainReferenceLength** (1 byte) - length of next field
4. **ChainReference** (variable) - chain identifier
5. **AddressLength** (1 byte) - length of next field
6. **Address** (variable) - target address bytes

---

## 4. Security

### Canonicity not guaranteed
- Some CAIP-350 profiles can't guarantee canonical addresses
- Check profile's "Extra Considerations" before using as map keys

### ENS normalization
Follow ENSIP-1 and ENSIP-15 to prevent homoglyph attacks:
- `vitalik.eth` vs `vitаlik.eth` (Cyrillic 'а')

### Address poisoning
Attackers create similar-looking addresses hoping users copy wrong one.

### ENS resolver changes
- Resolvers may change over time
- Wildcard resolvers (ENSIP-10) return dynamic data
- ENS names may resolve to different addresses over time depending on resolver behavior, which means that a previously generated checksum may no longer validate even when resolution is correct

### Checksum rationale
- Version field is excluded from checksum calculation to allow the same Interoperable Name to remain valid across version upgrades of the binary format

### Versioning (future)
- MSB of Version = 1 means NOT backward-compatible (parsers should reject or handle specially)
- Future versions MUST be convertible to Version 1

---

## Sources

| Standard | Direct Link |
|----------|-------------|
| ERC-7930 | https://github.com/ethereum/ERCs/blob/master/ERCS/erc-7930.md |
| ERC-7828 | https://github.com/ethereum/ERCs/blob/master/ERCS/erc-7828.md |
| EIP-155 | https://github.com/ethereum/EIPs/blob/master/EIPS/eip-155.md |
| CAIP-350 | https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-350.md |
| CAIP-2 | https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-2.md |
| CAIP-10 | https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-10.md |
| Namespaces | https://github.com/ChainAgnostic/namespaces |

**Link format pattern**:
- ERCs: `https://github.com/ethereum/ERCs/blob/master/ERCS/erc-{number}.md`
- EIPs: `https://github.com/ethereum/EIPs/blob/master/EIPS/eip-{number}.md`
- CAIPs: `https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-{number}.md`
